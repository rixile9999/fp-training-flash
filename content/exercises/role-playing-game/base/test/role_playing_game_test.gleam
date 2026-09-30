import gleam/option.{None, Some}
import gleeunit/should
import role_playing_game.{Player, introduce, revive}

pub fn introduce_with_name_test() {
  Player(name: Some("Gandalf"), level: 1, health: 42, mana: None)
  |> introduce
  |> should.equal("Gandalf")
}

pub fn introduce_without_name_test() {
  Player(name: None, level: 1, health: 42, mana: None)
  |> introduce
  |> should.equal("Mighty Magician")
}

pub fn revive_alive_returns_none_test() {
  Player(name: None, level: 12, health: 42, mana: Some(7))
  |> revive
  |> should.equal(None)
}

pub fn revive_low_level_test() {
  Player(name: None, level: 3, health: 0, mana: Some(5))
  |> revive
  |> should.equal(Some(Player(name: None, level: 3, health: 100, mana: Some(5))))
}

pub fn revive_level_ten_restores_mana_test() {
  Player(name: None, level: 10, health: 0, mana: Some(14))
  |> revive
  |> should.equal(
    Some(Player(name: None, level: 10, health: 100, mana: Some(100))),
  )
}

pub fn revive_high_level_without_mana_pool_test() {
  Player(name: None, level: 15, health: 0, mana: None)
  |> revive
  |> should.equal(
    Some(Player(name: None, level: 15, health: 100, mana: Some(100))),
  )
}

pub fn revive_keeps_name_and_level_test() {
  Player(name: Some("Merlin"), level: 7, health: 0, mana: None)
  |> revive
  |> should.equal(
    Some(Player(name: Some("Merlin"), level: 7, health: 100, mana: None)),
  )
}
