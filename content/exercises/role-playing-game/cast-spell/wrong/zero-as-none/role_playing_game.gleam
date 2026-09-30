import gleam/int
import gleam/option.{type Option, Some}

pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}

pub fn cast_spell(player: Player, cost: Int) -> #(Player, Int) {
  let mana = option.unwrap(player.mana, 0)
  case mana {
    0 -> #(Player(..player, health: int.max(0, player.health - cost)), 0)
    _ if mana >= cost -> #(Player(..player, mana: Some(mana - cost)), cost * 2)
    _ -> #(player, 0)
  }
}
