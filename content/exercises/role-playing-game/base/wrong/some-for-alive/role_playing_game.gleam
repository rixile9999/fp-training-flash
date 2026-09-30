import gleam/option.{type Option, Some}

pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}

pub fn introduce(player: Player) -> String {
  option.unwrap(player.name, "Mighty Magician")
}

pub fn revive(player: Player) -> Option(Player) {
  case player.health {
    0 if player.level >= 10 ->
      Some(Player(..player, health: 100, mana: Some(100)))
    0 -> Some(Player(..player, health: 100))
    _ -> Some(player)
  }
}
