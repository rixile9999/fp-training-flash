import gleam/option.{type Option}

pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}

pub fn cast_spell(player: Player, cost: Int) -> #(Player, Int) {
  todo
}
