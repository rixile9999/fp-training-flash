`introduce` has just one rule, "use a default if there is no name", so the single line `option.unwrap(player.name, "Mighty Magician")` is enough. `unwrap` makes the caller decide which value to use for `None`, so the missing case cannot be forgotten.

For `revive`, "cannot be revived" is also a normal result. The return type is `Option(Player)`, so for a player with health left, return `None`. A common mistake is to wrap the original player as `Some(player)` and return it. Then the caller cannot tell "was revived" apart from "nothing happened".

If you split on both values together with `case player.health, player.level`, each rule corresponds to one branch.

- Health 0 and level 10 or above: health 100, mana `Some(100)`
- Health 0: health 100, mana unchanged
- Everything else: `None`

The order of the branches matters. The more specific condition (level 10 or above) has to come first. Watch the boundary too. "10 or above" is `>= 10`; if you write `> 10`, a level-10 player does not get their mana restored.

If you write `option.map(player.mana, fn(_) { 100 })` for level 10 or above, a player whose original mana is `None` stays `None`. That is because `map` only changes the value inside `Some` and leaves `None` as it is. Here you have to put in `Some(100)` regardless of the existing value.

The record update syntax `Player(..player, health: 100)` copies the fields you do not mention (name, level) as they are, so it naturally keeps the rule "the name and level do not change".

Why you should show "there may be no result" in the return type instead of writing a partial function is covered further in the theory note "Total and partial functions" (total-vs-partial-functions).
