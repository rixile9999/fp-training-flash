창고 바닥 격자에서 로봇이 출발 칸 `S`로부터 `max_steps`번 이하로 움직여 닿을 수 있는 칸이 몇 개인지 세세요.

```gleam
pub fn reachable_count(floor: List(String), max_steps: Int) -> Int
```

- 각 문자열이 한 행이다. `S`는 로봇 위치, `#`은 선반(지나갈 수 없음), `.`은 통로다.
- 로봇은 한 번에 상하좌우 한 칸 움직이고, 선반과 격자 밖으로는 갈 수 없다.
- 출발 칸도 센다(0번 이동). 각 칸은 한 번만 센다. `max_steps`는 0 이상이다.
- `S`가 없으면 0을 돌려준다.

모듈 아래쪽에 도구가 준비되어 있습니다. 두 리스트로 만든 불변 큐(`new_queue`, `push`, `pop`), 격자를 `Dict(Pos, String)`으로 바꾸는 `parse_grid`, 문자의 위치를 찾는 `find_cell`, 이동할 수 있는 이웃을 돌려주는 `open_neighbors`입니다. `Pos`는 `#(행, 열)`입니다.

```gleam
reachable_count([
  ".#..",
  "S#..",
  "....",
], 3)
// -> 5   S(0번), S의 위와 아래 칸(1번), 맨 아래 행의 둘째 칸(2번), 셋째 칸(3번)
```
