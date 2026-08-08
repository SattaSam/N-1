$ErrorActionPreference="Stop"

$managerPath = Join-Path $PSScriptRoot "engine\mission-manager.js"
$objectPath = Join-Path $PSScriptRoot "engine\object-m0-bridge.js"
$actionPath = Join-Path $PSScriptRoot "engine\action-bridge.js"
$indexPath = Join-Path $PSScriptRoot "index.html"
$bibleRuntimePath = Join-Path $PSScriptRoot "engine\bible-runtime.js"
$bibleCatalogPath = Join-Path $PSScriptRoot "data\bible-catalog.js"

foreach($p in @($managerPath,$objectPath,$actionPath,$indexPath,$bibleRuntimePath,$bibleCatalogPath)){
  if(!(Test-Path $p)){ throw "Fichier requis introuvable : $p" }
}

$manager = Get-Content -Raw -Encoding UTF8 $managerPath
$object = Get-Content -Raw -Encoding UTF8 $objectPath
$action = Get-Content -Raw -Encoding UTF8 $actionPath
$index = Get-Content -Raw -Encoding UTF8 $indexPath
$bible = Get-Content -Raw -Encoding UTF8 $bibleRuntimePath
$catalog = Get-Content -Raw -Encoding UTF8 $bibleCatalogPath

# Vérification fonctionnelle du jalon GitHub actuel.
$baseOk =
  $bible.Contains("BF.bibleRuntime") -and
  $catalog.Contains("BIBLE-V0-DISCOVERY") -and
  $manager.Contains("progressPassiveMissions") -and
  $manager.Contains("resolveInitialMission") -and
  $object.Contains("const fanOut = (manager, event")

if(!$baseOk){
  throw "Base GitHub cible non reconnue fonctionnellement. Aucun fichier modifie."
}

# Déjà appliqué ?
if(
  $manager.Contains("chooseRunnableMissionAction(context)") -and
  $manager.Contains("mission-action-watchdog-v1") -and
  $object.Contains("stale-target-reset-v1") -and
  $object.Contains("mission-interaction-refused") -and
  $action.Contains("mission-interaction-refused")
){
  Write-Host "Correctif cumulatif deja installe." -ForegroundColor Yellow
  exit 0
}

# ---------- MissionManager : multi-mission autonome + watchdog ----------
$oldUpdate = @'
    update(now) {
      if (!this.enabled) return false;
      this.applyPendingTransitions();
      if (now - this.lastPriorityReviewAt > 5000) {
        this.lastPriorityReviewAt = now;
        this.selectBestPrimary(now);
      }
      if (
        !this.tree ||
        this.tree.root.isComplete ||
        this.ensureLifecycle(this.primaryMissionId).status !== "active"
      ) return false;
      if (this.currentAction) return true;
      if (now < this.retryAfter || now - this.lastPlanAt < 1200) return false;
      if (this.bridge.isEngineBusy()) return false;

      this.lastPlanAt = now;
      const action = this.planner.nextAction(this.tree, this.bridge.context());
      if (!action) {
        this.retryAfter = now + 5000;
        return false;
      }
      if (!this.bridge.execute(action, now)) {
        this.retryAfter = now + 4000;
        return false;
      }
      this.currentAction = action;
      const node = this.tree.find(action.nodeId);
      if (node && node.status === Missions.MissionStatus.AVAILABLE) {
        node.status = Missions.MissionStatus.ACTIVE;
        if (!node.startedAt) node.startedAt = Date.now();
      }
      this.engine.callbacks.onAction(`Mission : ${action.title}.`);
      this.memory.remember("action-started", action);
      this.memory.saveTree(this.tree);
      this.publish();
      return true;
    }
'@

$newUpdate = @'
    missionActionAxis(missionId, action) {
      const definition = this.definition(missionId) || {};
      if (definition.passivePriorityAxis) return definition.passivePriorityAxis;
      if (definition.priorityAxis) return definition.priorityAxis;
      const type = action?.type;
      if ([Missions.ActionType.COLLECT, Missions.ActionType.EXTRACT].includes(type)) return "collection";
      if ([
        Missions.ActionType.INSPECT,
        Missions.ActionType.ANALYZE,
        Missions.ActionType.OBSERVE,
        Missions.ActionType.RESEARCH,
        Missions.ActionType.CRAFT,
        Missions.ActionType.BUILD
      ].includes(type)) return "research";
      if ([Missions.ActionType.EXPLORE_ZONE, Missions.ActionType.TRAVEL].includes(type)) return "exploration";
      if ([Missions.ActionType.REST, Missions.ActionType.EAT].includes(type)) return "survival";
      return "exploration";
    }

    chooseRunnableMissionAction(context) {
      const assessments = this.activeMissionIds
        .filter((id) => this.ensureLifecycle(id).status === "active" && this.trees.has(id))
        .map((id) => this.assessMission(id, context))
        .filter((candidate) => candidate?.action);

      const primary = assessments.find(
        (candidate) => candidate.missionId === this.primaryMissionId
      ) || null;

      const secondaries = assessments
        .filter((candidate) => candidate.missionId !== this.primaryMissionId)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      if (!primary && !secondaries.length) return null;

      const primaryVital = primary && (
        (primary.action.type === Missions.ActionType.REST && context.needs?.rest) ||
        (primary.action.type === Missions.ActionType.EAT && context.needs?.food)
      );
      if (primaryVital) {
        return {
          missionId: primary.missionId,
          action: primary.action,
          primary: true
        };
      }

      const BAC = BF.BAC;
      if (!BAC?.weightedPick) {
        const fallback = primary || secondaries[0];
        return fallback
          ? {
              missionId: fallback.missionId,
              action: fallback.action,
              primary: fallback.missionId === this.primaryMissionId
            }
          : null;
      }

      const options = [];
      if (primary) {
        options.push({
          id: `mission-primary:${primary.missionId}`,
          axis: this.missionActionAxis(primary.missionId, primary.action),
          baseWeight: 100,
          candidate: primary
        });
      }

      if (secondaries.length) {
        const secondaryBudget = primary ? 20 : 100;
        const totalScore = secondaries.reduce(
          (sum, candidate) => sum + Math.max(1, Number(candidate.score) || 1),
          0
        );
        secondaries.forEach((candidate) => {
          options.push({
            id: `mission-secondary:${candidate.missionId}`,
            axis: this.missionActionAxis(candidate.missionId, candidate.action),
            baseWeight:
              secondaryBudget *
              (Math.max(1, Number(candidate.score) || 1) / totalScore),
            candidate
          });
        });
      }

      const selected = BAC.weightedPick(options);
      const candidate = selected?.candidate || primary || secondaries[0];
      return candidate
        ? {
            missionId: candidate.missionId,
            action: candidate.action,
            primary: candidate.missionId === this.primaryMissionId
          }
        : null;
    }

    update(now) {
      if (!this.enabled) return false;
      this.applyPendingTransitions();
      if (now - this.lastPriorityReviewAt > 5000) {
        this.lastPriorityReviewAt = now;
        this.selectBestPrimary(now);
      }

      // mission-action-watchdog-v1
      if (this.currentAction) {
        const actionAge =
          Date.now() - Number(this.currentAction.issuedAt || Date.now());
        const engineIdle =
          !this.bridge.isEngineBusy() &&
          !this.engine.pendingInteraction &&
          !this.engine.currentRoutine &&
          !this.engine.pendingGate &&
          !this.engine.pendingZoneExploration &&
          this.engine.character.root.position.distanceTo(
            this.engine.character.target
          ) < 0.25;

        if (engineIdle && actionAge > 5000) {
          const orphan = this.currentAction;
          this.memory.remember("action-orphaned", {
            ...orphan,
            reason: "engine-idle-with-current-action",
            ageMs: actionAge
          });
          this.currentAction = null;
          this.retryAfter = now + 650;
          this.engine.callbacks?.onAction?.(
            `Mission : action interrompue, nouvelle tentative pour « ${orphan.title} ».`
          );
          this.publish();
        } else {
          return true;
        }
      }

      if (now < this.retryAfter || now - this.lastPlanAt < 1200) return false;
      if (this.bridge.isEngineBusy()) return false;

      this.lastPlanAt = now;
      const selected = this.chooseRunnableMissionAction(this.bridge.context());
      if (!selected?.action) {
        this.retryAfter = now + 5000;
        return false;
      }

      const action = {
        ...selected.action,
        missionId: selected.missionId,
        isSecondary: !selected.primary
      };
      const tree = this.trees.get(selected.missionId);
      if (!tree || !this.bridge.execute(action, now)) {
        this.retryAfter = now + 4000;
        return false;
      }

      this.currentAction = action;
      const node = tree.find(action.nodeId);
      if (node && node.status === Missions.MissionStatus.AVAILABLE) {
        node.status = Missions.MissionStatus.ACTIVE;
        if (!node.startedAt) node.startedAt = Date.now();
      }

      this.engine.callbacks.onAction(
        selected.primary
          ? `Mission : ${action.title}.`
          : `Mission secondaire : ${action.title}.`
      );
      this.memory.remember("action-started", action);
      this.memory.saveTree(tree);
      this.publish();
      return true;
    }
'@

$oldCompletion = @'
      const completedAction = this.currentAction;
      if (!this.planner.applyCompletion(this.tree, completedAction, detail)) {
        return false;
      }
'@

$newCompletion = @'
      const completedAction = this.currentAction;
      const missionId = completedAction.missionId || this.primaryMissionId;
      const actionTree = this.trees.get(missionId) || this.tree;
      if (!actionTree) return false;
      if (!this.planner.applyCompletion(actionTree, completedAction, detail)) {
        return false;
      }
'@

# ---------- ActionBridge : refus interaction => false ----------
$oldAction = @'
          candidates[0].userData.requestedInteraction = action.type;
          candidates[0].userData.requestedInteractionSource = "mission";
          candidates[0].userData.missionSubject = action.params?.subject || null;
          engine.targetInteraction(candidates[0]);
          return true;
'@

$newAction = @'
          candidates[0].userData.requestedInteraction = action.type;
          candidates[0].userData.requestedInteractionSource = "mission";
          candidates[0].userData.missionSubject = action.params?.subject || null;

          const accepted = engine.targetInteraction(candidates[0]);
          if (accepted === false) {
            candidates[0].userData.requestedInteraction = null;
            candidates[0].userData.requestedInteractionSource = null;
            candidates[0].userData.missionSubject = null;
            candidates[0].userData.lastInteractionAt = performance.now();
            engine.callbacks?.onAction?.("mission-interaction-refused");
            return false;
          }
          return true;
'@

# ---------- Object bridge : refus interaction + stale target ----------
$oldObjectExec = @'
        if (target) {
          target.userData.requestedInteraction = action.type;
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;
          this.engine.targetInteraction(target);
          return true;
        }
'@

$newObjectExec = @'
        if (target) {
          target.userData.requestedInteraction = action.type;
          target.userData.requestedInteractionSource = "mission";
          target.userData.missionSubject = action.params?.subject || null;

          const accepted = this.engine.targetInteraction(target);
          if (accepted === false) {
            target.userData.requestedInteraction = null;
            target.userData.requestedInteractionSource = null;
            target.userData.missionSubject = null;
            target.userData.lastInteractionAt = performance.now();
            this.engine.callbacks?.onAction?.("mission-interaction-refused");
            return false;
          }
          return true;
        }
'@

$oldReject = @'
      if (!resolved.definition || !mode) {
        console.warn("[BlueFox O5.1] Interaction refusée : objet absent ou incomplet dans le CUO.", object);
        this.callbacks.onStatus("BlueFox ne sait pas encore comment interagir avec cet objet.");
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;
        return false;
      }
'@

$newReject = @'
      if (!resolved.definition || !mode) {
        console.warn("[BlueFox O5.1] Interaction refusée : objet absent ou incomplet dans le CUO.", object);
        this.callbacks.onStatus("BlueFox ne sait pas encore comment interagir avec cet objet.");
        object.userData.requestedInteraction = null;
        object.userData.requestedInteractionSource = null;

        // stale-target-reset-v1
        this.pendingInteraction = null;
        this.interactionStartedAt = 0;
        this.interactionApproachStartedAt = 0;
        this.interactionApproachAttempts = 0;
        this.character.stop?.();
        this.character.setTarget?.(this.character.root.position);
        this.postActionRecoveryUntil = performance.now() + 350;
        return false;
      }
'@

# ---------- PRECHECK COMPLET ----------
foreach($pair in @(
  @($oldUpdate,"MissionManager.update"),
  @($oldCompletion,"MissionManager.notifyActionCompleted"),
  @($oldAction,"ActionBridge interaction"),
  @($oldObjectExec,"ObjectM0 executeObjectAware"),
  @($oldReject,"ObjectM0 targetInteraction reject")
)){
  if(-not $pair[0]){ throw "PRECHECK interne invalide [$($pair[1])]" }
  $source = switch($pair[1]){
    "MissionManager.update" { $manager }
    "MissionManager.notifyActionCompleted" { $manager }
    "ActionBridge interaction" { $action }
    default { $object }
  }
  if(!$source.Contains($pair[0])){
    throw "PRECHECK ECHEC : bloc introuvable [$($pair[1])]. Aucun fichier modifie."
  }
}

# ---------- BACKUPS ----------
foreach($p in @($managerPath,$objectPath,$actionPath,$indexPath)){
  $bak="$p.before-missions-cumulative-v1.bak"
  if(!(Test-Path $bak)){ Copy-Item $p $bak -Force }
}

# ---------- APPLICATION ----------
$manager = $manager.Replace($oldUpdate,$newUpdate)
$manager = $manager.Replace($oldCompletion,$newCompletion)

$notifyPos = $manager.IndexOf('    notifyActionCompleted(type, detail = {}, options = {})')
if($notifyPos -lt 0){ throw "notifyActionCompleted introuvable apres patch." }

$saveNeedle = '      this.memory.saveTree(this.tree);'
$savePos = $manager.IndexOf($saveNeedle,$notifyPos)
if($savePos -lt 0){ throw "saveTree de notifyActionCompleted introuvable." }
$manager =
  $manager.Substring(0,$savePos) +
  '      this.memory.saveTree(actionTree);' +
  $manager.Substring($savePos + $saveNeedle.Length)

$manager = $manager.Replace(
  '          missionId: this.primaryMissionId,',
  '          missionId,'
)
$manager = $manager.Replace(
  '      if (this.tree.root.isComplete) {',
  '      if (actionTree.root.isComplete) {'
)
$manager = $manager.Replace(
  '`Mission accomplie : ${this.tree.title}.`',
  '`Mission accomplie : ${actionTree.title}.`'
)
$manager = $manager.Replace(
  '`« ${this.tree.title} » terminée. BlueFox réévalue uniquement les projets déjà actifs.`',
  '`« ${actionTree.title} » terminée. BlueFox réévalue uniquement les projets déjà actifs.`'
)

$action = $action.Replace($oldAction,$newAction)
$object = $object.Replace($oldObjectExec,$newObjectExec)
$object = $object.Replace($oldReject,$newReject)

Set-Content -Path $managerPath -Value $manager -Encoding UTF8 -NoNewline
Set-Content -Path $objectPath -Value $object -Encoding UTF8 -NoNewline
Set-Content -Path $actionPath -Value $action -Encoding UTF8 -NoNewline

# Cache busts uniquement.
$index = [regex]::Replace(
  $index,
  '\./engine/mission-manager\.js\?v=[^"]+',
  './engine/mission-manager.js?v=missions-cumulative-v1',
  1
)
$index = [regex]::Replace(
  $index,
  '\./engine/action-bridge\.js\?v=[^"]+',
  './engine/action-bridge.js?v=missions-cumulative-v1',
  1
)
$index = [regex]::Replace(
  $index,
  '\./engine/object-m0-bridge\.js\?v=[^"]+',
  './engine/object-m0-bridge.js?v=missions-cumulative-v1',
  1
)
Set-Content -Path $indexPath -Value $index -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "CORRECTIF CUMULATIF MISSIONS V1 APPLIQUE" -ForegroundColor Green
Write-Host "Base GitHub auditée : OK"
Write-Host "Inclus :"
Write-Host " - arbitrage mission principale / secondaires via BAC"
Write-Host " - budget secondaires global 20 vs principale 100"
Write-Host " - completion sur l'arbre reel de la mission executante"
Write-Host " - refus d'interaction propage correctement false"
Write-Host " - reset cible de navigation apres refus"
Write-Host " - watchdog currentAction orpheline apres 5 s"
Write-Host ""
Write-Host "Non inclus volontairement : bug hitbox cactus."
