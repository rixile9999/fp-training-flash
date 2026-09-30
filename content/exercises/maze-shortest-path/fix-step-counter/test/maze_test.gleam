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

pub fn goal_next_to_start_test() {
  maze.shortest_path(["..", "SG"])
  |> should.equal(Ok(1))
}

pub fn side_branch_not_counted_test() {
  maze.shortest_path([
    "....",
    "S..G",
    "....",
  ])
  |> should.equal(Ok(3))
}

pub fn open_room_test() {
  maze.shortest_path([
    "S.....",
    "......",
    "......",
    "......",
    ".....G",
  ])
  |> should.equal(Ok(9))
}

pub fn unreachable_goal_test() {
  maze.shortest_path([
    "S.#.",
    "..#G",
  ])
  |> should.equal(Error(Nil))
}
