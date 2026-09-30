작은 축구 대회의 경기 결과를 모아 순위표 문자열을 만드세요. 한 함수에 모두 넣지 말고, 아래 도우미 함수들로 나눠 작성합니다. 테스트는 각 함수를 따로 호출합니다.

**입력**: 한 줄에 경기 하나, 줄 구분은 `"\n"`. 형식은 `홈 팀;원정 팀;결과`이고 결과는 **홈 팀 기준**입니다.

- `A;B;win` → A 승, B 패
- `A;B;loss` → A 패, B 승
- `A;B;draw` → 둘 다 무승부

승리는 승점 3, 무승부 1, 패배 0입니다.

```gleam
pub type Outcome { Win Draw Loss }
pub type Match { Match(home: String, away: String, outcome: Outcome) }
pub type Stats { Stats(won: Int, drawn: Int, lost: Int) }
pub const header = "Team                           | MP |  W |  D |  L |  P"
```

1. `parse_line(line: String) -> Result(Match, Nil)`: `;`로 나눈 조각이 정확히 세 개이고 결과가 `win`, `draw`, `loss` 중 하나일 때만 `Ok`. 그 밖의 줄(빈 줄 포함)은 `Error(Nil)`.
2. `record(table: Dict(String, Stats), match: Match) -> Dict(String, Stats)`: 경기 하나를 두 팀의 전적에 반영한다. 처음 나온 팀은 `Stats(0, 0, 0)`에서 시작한다.
3. `format_row(team: String, stats: Stats) -> String`: 팀 이름을 30칸(오른쪽을 공백으로 채움), 이어서 경기 수(MP), 승, 무, 패, 승점을 각각 2칸(왼쪽을 공백으로 채움)으로 만들고 `" | "`로 잇는다.
4. `tally(input: String) -> String`: 형식이 틀린 줄은 건너뛰고, `header` 다음 줄부터 팀 행을 **승점 내림차순, 같으면 팀 이름 오름차순**으로 놓고 `"\n"`으로 잇는다. 경기가 하나도 없으면 `header`만 돌려준다.

```gleam
tally("Allegoric Alaskans;Blithering Badgers;win\nBlithering Badgers;Courageous Californians;draw")
```

```text
Team                           | MP |  W |  D |  L |  P
Allegoric Alaskans             |  1 |  1 |  0 |  0 |  3
Blithering Badgers             |  2 |  0 |  1 |  1 |  1
Courageous Californians        |  1 |  0 |  1 |  0 |  1
```
