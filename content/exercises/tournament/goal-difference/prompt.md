이번 리그는 경기 점수를 기록하고, 승점이 같으면 **골득실**(넣은 골 - 먹은 골)로 순위를 가립니다. 아래 도우미 함수들로 나눠 순위표를 만드세요. 테스트는 각 함수를 따로 호출합니다.

**입력**: 한 줄에 경기 하나, 줄 구분은 `"\n"`. 형식은 `홈 팀;원정 팀;홈득점-원정득점`(득점은 0 이상의 정수). 득점이 많은 팀이 승리, 같으면 무승부. 승리 3점, 무승부 1점, 패배 0점.

```gleam
pub type Match { Match(home: String, away: String, home_goals: Int, away_goals: Int) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int, goals_for: Int, goals_against: Int) }
pub const header = "Team                 | MP |  W |  D |  L |  GD |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`: `;`로 나눈 조각이 세 개이고, 점수가 `-`로 나뉜 정수 두 개일 때만 `Ok`. 그 밖의 줄(빈 줄, `3:0`, `x-1` 등)은 `Error(Nil)`.
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`: 두 팀의 승무패와 득점(`goals_for`)·실점(`goals_against`)을 갱신한다. 처음 나온 팀은 모두 0에서 시작한다.
3. `compare_rows(a: #(String, Stats), b: #(String, Stats)) -> Order`: `list.sort`에 넘길 비교 함수. 승점 내림차순 → 골득실 내림차순 → 팀 이름 오름차순.
4. `format_row(team: String, stats: Stats) -> String`: 팀 이름 20칸(왼쪽 정렬), 경기 수·승·무·패 각 2칸, 골득실 3칸, 승점 2칸(모두 오른쪽 정렬)을 `" | "`로 잇는다. 골득실은 양수면 `+2`, 음수면 `-1`, 0이면 `0`.
5. `standings(input: String) -> String`: 형식이 틀린 줄은 건너뛰고, `header` 뒤에 정렬된 팀 행을 `"\n"`으로 잇는다.

```gleam
standings("Seoul;Busan;2-0\nBusan;Daegu;1-1")
```

```text
Team                 | MP |  W |  D |  L |  GD |  P
Seoul                |  1 |  1 |  0 |  0 |  +2 |  3
Daegu                |  1 |  0 |  1 |  0 |   0 |  1
Busan                |  2 |  0 |  1 |  1 |  -2 |  1
```
