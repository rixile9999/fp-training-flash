import go.{type Game, Black, Game, White}
import gleeunit/should

fn capture_white(game: Game) -> Result(Game, String) {
  Ok(Game(..game, white_captured_stones: game.white_captured_stones + 1))
}

fn double_white(game: Game) -> Result(Game, String) {
  Ok(Game(..game, white_captured_stones: game.white_captured_stones * 2))
}

fn fail_with(message: String) -> fn(Game) -> Result(Game, String) {
  fn(_game) { Error(message) }
}

pub fn no_rules_changes_player_test() {
  Game(1, 2, White)
  |> go.apply_rules([])
  |> should.equal(Ok(Game(1, 2, Black)))
}

pub fn all_rules_pass_test() {
  Game(0, 0, Black)
  |> go.apply_rules([capture_white])
  |> should.equal(Ok(Game(1, 0, White)))
}

pub fn failing_rule_returns_error_test() {
  Game(0, 0, White)
  |> go.apply_rules([capture_white, fail_with("패 규칙 위반")])
  |> should.equal(Error("패 규칙 위반"))
}

pub fn each_rule_sees_previous_result_test() {
  Game(0, 0, White)
  |> go.apply_rules([capture_white, capture_white, capture_white])
  |> should.equal(Ok(Game(3, 0, Black)))
}

pub fn rules_apply_in_list_order_test() {
  Game(1, 0, White)
  |> go.apply_rules([capture_white, double_white])
  |> should.equal(Ok(Game(4, 0, Black)))
}

pub fn first_error_wins_test() {
  Game(0, 0, White)
  |> go.apply_rules([
    fail_with("이미 돌이 있는 자리입니다"),
    capture_white,
    fail_with("패 규칙 위반"),
  ])
  |> should.equal(Error("이미 돌이 있는 자리입니다"))
}
