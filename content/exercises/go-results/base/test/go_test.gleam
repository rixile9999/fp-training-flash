import go.{type Game, Black, Game, White}
import gleeunit/should

fn pass(game: Game) -> Result(Game, String) {
  Ok(game)
}

fn no_capture(game: Game) -> Game {
  game
}

fn fail_with(message: String) -> fn(Game) -> Result(Game, String) {
  fn(_game) { Error(message) }
}

fn capture_white_stone(game: Game) -> Game {
  Game(..game, white_captured_stones: game.white_captured_stones + 1)
}

fn new_game() -> Game {
  Game(white_captured_stones: 0, black_captured_stones: 0, player: White, error: "")
}

pub fn change_player_if_all_rules_pass_test() {
  new_game()
  |> go.apply_rules(pass, no_capture, pass, pass)
  |> should.equal(Game(0, 0, Black, ""))
}

pub fn first_rule_failure_records_error_test() {
  new_game()
  |> go.apply_rules(fail_with("이미 돌이 있는 자리입니다"), no_capture, pass, pass)
  |> should.equal(Game(0, 0, White, "이미 돌이 있는 자리입니다"))
}

pub fn keep_capture_changes_test() {
  Game(2, 1, Black, "")
  |> go.apply_rules(pass, capture_white_stone, pass, pass)
  |> should.equal(Game(3, 1, White, ""))
}

pub fn last_rule_failure_records_error_test() {
  Game(0, 4, Black, "")
  |> go.apply_rules(pass, no_capture, pass, fail_with("패 규칙 위반"))
  |> should.equal(Game(0, 4, Black, "패 규칙 위반"))
}

pub fn discard_capture_changes_on_later_failure_test() {
  new_game()
  |> go.apply_rules(pass, capture_white_stone, pass, fail_with("패 규칙 위반"))
  |> should.equal(Game(0, 0, White, "패 규칙 위반"))
}

pub fn first_error_wins_test() {
  new_game()
  |> go.apply_rules(
    pass,
    no_capture,
    fail_with("활로가 없는 자리입니다"),
    fail_with("패 규칙 위반"),
  )
  |> should.equal(Game(0, 0, White, "활로가 없는 자리입니다"))
}
