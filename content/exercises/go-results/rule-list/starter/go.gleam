pub type Player {
  Black
  White
}

pub type Game {
  Game(white_captured_stones: Int, black_captured_stones: Int, player: Player)
}

pub type Rule =
  fn(Game) -> Result(Game, String)

pub fn apply_rules(game: Game, rules: List(Rule)) -> Result(Game, String) {
  todo
}
