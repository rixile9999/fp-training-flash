import gleam/int
import gleam/option.{type Option, Some}

pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}

const max_mana = 100

pub fn drink_potion(player: Player, amount: Int) -> Option(Player) {
  let mana = option.unwrap(player.mana, 0)
  Some(Player(..player, mana: Some(int.min(mana + amount, max_mana))))
}
