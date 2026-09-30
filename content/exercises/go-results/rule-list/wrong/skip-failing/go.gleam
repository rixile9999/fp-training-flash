import gleam/list

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
  let final =
    list.fold(rules, game, fn(current, rule) {
      case rule(current) {
        Ok(next) -> next
        Error(_) -> current
      }
    })
  Ok(change_player(final))
}

fn change_player(game: Game) -> Game {
  let next = case game.player {
    White -> Black
    Black -> White
  }
  Game(..game, player: next)
}
