import gleam/option.{None, Some}
import gleeunit/should
import role_playing_game.{Player, drink_potion}

pub fn restores_mana_test() {
  Player(name: None, level: 3, health: 50, mana: Some(30))
  |> drink_potion(50)
  |> should.equal(Some(Player(name: None, level: 3, health: 50, mana: Some(80))))
}

pub fn caps_at_max_test() {
  Player(name: None, level: 3, health: 50, mana: Some(90))
  |> drink_potion(30)
  |> should.equal(
    Some(Player(name: None, level: 3, health: 50, mana: Some(100))),
  )
}

pub fn no_mana_pool_returns_none_test() {
  Player(name: None, level: 3, health: 50, mana: None)
  |> drink_potion(30)
  |> should.equal(None)
}

pub fn empty_mana_can_drink_test() {
  Player(name: None, level: 8, health: 12, mana: Some(0))
  |> drink_potion(20)
  |> should.equal(Some(Player(name: None, level: 8, health: 12, mana: Some(20))))
}

pub fn keeps_other_fields_test() {
  Player(name: Some("Morgana"), level: 21, health: 7, mana: Some(40))
  |> drink_potion(10)
  |> should.equal(
    Some(Player(name: Some("Morgana"), level: 21, health: 7, mana: Some(50))),
  )
}
