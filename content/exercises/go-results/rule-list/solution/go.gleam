import gleam/list
import gleam/result

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
  rules
  |> list.try_fold(game, fn(current, rule) { rule(current) })
  |> result.map(change_player)
}

fn change_player(game: Game) -> Game {
  let next = case game.player {
    White -> Black
    Black -> White
  }
  Game(..game, player: next)
}
