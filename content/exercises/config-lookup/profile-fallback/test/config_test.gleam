import config.{MissingKey, NotAnInt, UnknownProfile, resolve, resolve_int}
import gleam/dict
import gleeunit/should

fn profiles() {
  dict.from_list([
    #("default", dict.from_list([#("host", "localhost"), #("port", "5432")])),
    #("prod", dict.from_list([#("host", "db.internal"), #("pool", "20")])),
    #("test", dict.new()),
  ])
}

pub fn resolve_own_value_test() {
  resolve(profiles(), "prod", "host")
  |> should.equal(Ok("db.internal"))
}

pub fn resolve_falls_back_to_default_test() {
  resolve(profiles(), "test", "host")
  |> should.equal(Ok("localhost"))
}

pub fn unknown_profile_test() {
  resolve(profiles(), "staging", "pool")
  |> should.equal(Error(UnknownProfile("staging")))
}

pub fn unknown_profile_does_not_fall_back_test() {
  resolve(profiles(), "staging", "host")
  |> should.equal(Error(UnknownProfile("staging")))
}

pub fn missing_everywhere_test() {
  resolve(profiles(), "prod", "timeout")
  |> should.equal(Error(MissingKey("timeout")))
}

pub fn works_without_default_profile_test() {
  dict.from_list([#("prod", dict.from_list([#("host", "db.internal")]))])
  |> resolve("prod", "port")
  |> should.equal(Error(MissingKey("port")))
}

pub fn resolve_int_uses_fallback_test() {
  resolve_int(profiles(), "prod", "port")
  |> should.equal(Ok(5432))
}

pub fn invalid_value_does_not_fall_back_test() {
  dict.from_list([
    #("default", dict.from_list([#("port", "5432")])),
    #("prod", dict.from_list([#("port", "54x2")])),
  ])
  |> resolve_int("prod", "port")
  |> should.equal(Error(NotAnInt("port", "54x2")))
}
