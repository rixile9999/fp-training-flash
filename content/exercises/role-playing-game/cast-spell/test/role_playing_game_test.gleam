import gleam/option.{None, Some}
import gleeunit/should
import role_playing_game.{Player, cast_spell}

pub fn successful_cast_test() {
  Player(name: None, level: 10, health: 69, mana: Some(20))
  |> cast_spell(9)
  |> should.equal(#(Player(name: None, level: 10, health: 69, mana: Some(11)), 18))
}

pub fn insufficient_mana_test() {
  Player(name: None, level: 10, health: 69, mana: Some(20))
  |> cast_spell(39)
  |> should.equal(#(Player(name: None, level: 10, health: 69, mana: Some(20)), 0))
}

pub fn no_mana_pool_costs_health_test() {
  Player(name: None, level: 5, health: 58, mana: None)
  |> cast_spell(7)
  |> should.equal(#(Player(name: None, level: 5, health: 51, mana: None), 0))
}

pub fn exact_mana_test() {
  Player(name: Some("Merlin"), level: 12, health: 30, mana: Some(15))
  |> cast_spell(15)
  |> should.equal(#(
    Player(name: Some("Merlin"), level: 12, health: 30, mana: Some(0)),
    30,
  ))
}

pub fn health_not_below_zero_test() {
  Player(name: None, level: 5, health: 6, mana: None)
  |> cast_spell(12)
  |> should.equal(#(Player(name: None, level: 5, health: 0, mana: None), 0))
}

pub fn zero_mana_is_not_no_pool_test() {
  Player(name: None, level: 4, health: 50, mana: Some(0))
  |> cast_spell(5)
  |> should.equal(#(Player(name: None, level: 4, health: 50, mana: Some(0)), 0))
}
