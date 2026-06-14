with open('src/components/CardBattle.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add executeHeavyAttack function and refactor heavy attack
old = '''      setAttackAnim("boss");
      setTimeout(() => {
        setAttackAnim(null);

        const dodgeRoll = Math.random() * 100;
        const evaded = dodgeRoll < targetPlayer.evasionChance && targetPlayer.dodgeActive;

        if (evaded) {
          setIsDodging(true);
          spawnDmg(0, "player", false, false, false, false, false, true);
          announce("💨 NÉ!", "#22c55e");
          addLog(`${targetPlayer.name} né được đòn!`, "dodge");
          setTimeout(() => setIsDodging(false), 400);
        } else {
          // Elemental move: apply status effect'''

new = '''      setAttackAnim("boss");
      setTimeout(() => {
        setAttackAnim(null);

        # ---- Execute heavy attack helper ----
        def executeHeavyAttack():
            setProjectile({ from: "boss", to: "player", elementId: boss.elementId })
            setTimeout(() => {
                setProjectile(null)
                triggerHit("player")
                triggerShake()
                setHitSparks({ target: "player", elementId: boss.elementId })
                setTimeout(() => setHitSparks(null), 600)
                const { dmg, isCrit, notes } = calcBattleDamage(boss, targetPlayer, Math.floor(boss.atk * 1.6))
                const advInfo = getAdvantageInfo(boss.elementId, targetPlayer.elementId)
                if (advInfo) showBanner(advInfo, "player")
                perfectionRef.current = false
                spawnDmg(dmg, "player", isCrit, !!advInfo && advInfo.mult > 1, !!advInfo && advInfo.mult < 1)
                const noteStr = notes.length > 0 ? ` [${notes.join(", ")}]` : ""
                addLog(`💥 ${boss.name} Đòn Nặng! → ${dmg} dmg${noteStr}`, "damage")
                const { died } = applyDamage("player", targetIdx, dmg)
                comboRef.current = 0
                if (died) {
                    addLog(`${targetPlayer.name} đã bị đánh bại!`, "ko")
                    announce("💀 KO!", "#f59e0b")
                    setTimeout(() => {
                        const nextAlive = pRef.current.findIndex((c, i) => i > targetIdx && c.isAlive)
                        const newIdx = nextAlive !== -1 ? nextAlive : pRef.current.findIndex((c) => c.isAlive)
                        if (newIdx !== -1) setActivePlayerIdx(newIdx)
                    }, 300)
                }
            }, 400)
        # ---- End executeHeavyAttack ----

        const dodgeRoll = Math.random() * 100;
        const evaded = dodgeRoll < targetPlayer.evasionChance && targetPlayer.dodgeActive;

        if (evaded) {
          setIsDodging(true);
          spawnDmg(0, "player", false, false, false, false, false, true);
          announce("💨 NÉ!", "#22c55e");
          addLog(`${targetPlayer.name} né được đòn!`, "dodge");
          setTimeout(() => setIsDodging(false), 400);
        } else {
          // Elemental move: apply status effect'''

print("Step 1: Not doing this - it has Python in the replacement. Using manual JS approach.")

# Let me do this differently - use JS-style strings properly
old2 = '''      setAttackAnim("boss");
      setTimeout(() => {
        setAttackAnim(null);

        const dodgeRoll = Math.random() * 100;
        const evaded = dodgeRoll < targetPlayer.evasionChance && targetPlayer.dodgeActive;

        if (evaded) {
          setIsDodging(true);
          spawnDmg(0, "player", false, false, false, false, false, true);
          announce("💨 NÉ!", "#22c55e");
          addLog(`${targetPlayer.name} né được đòn!`, "dodge");
          setTimeout(() => setIsDodging(false), 400);
        } else {
          // Elemental move: apply status effect'''

# Since Python string escaping of JS template literals is tricky, let's use a different approach.
# Let's use the StrReplace tool instead for the simpler parts.
print("Use StrReplace for the JS changes instead of Python.")
