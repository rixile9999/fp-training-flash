import gleeunit/should
import maze

pub fn straight_corridor_test() {
  maze.shortest_path(["S..G"])
  |> should.equal(Ok(3))
}

pub fn goes_around_walls_test() {
  maze.shortest_path([
    "S#..",
    ".#.#",
    "...G",
  ])
  |> should.equal(Ok(5))
}

pub fn unreachable_goal_test() {
  maze.shortest_path([
    "S.#.",
    "..#G",
  ])
  |> should.equal(Error(Nil))
}

pub fn picks_shortest_of_many_routes_test() {
  maze.shortest_path([
    "S..G",
    "....",
    "....",
  ])
  |> should.equal(Ok(3))
}

pub fn no_diagonal_moves_test() {
  maze.shortest_path([
    "S#.",
    "#G.",
  ])
  |> should.equal(Error(Nil))
}

pub fn missing_start_or_goal_test() {
  #(maze.shortest_path(["S...", "...."]), maze.shortest_path(["...G", "...."]))
  |> should.equal(#(Error(Nil), Error(Nil)))
}

pub fn goal_next_to_start_test() {
  maze.shortest_path(["..", "SG"])
  |> should.equal(Ok(1))
}

pub fn open_room_test() {
  maze.shortest_path([
    "S.........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
    ".........G",
  ])
  |> should.equal(Ok(18))
}
