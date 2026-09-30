축구 대회 순위표를 만드는 프로그램이 단계별 함수로 나뉘어 있지만 결과가 틀립니다. 버그를 모두 찾아 고치세요. 함수 이름과 타입은 바꾸지 마세요.

**규칙**

- 입력은 한 줄에 경기 하나(`홈 팀;원정 팀;결과`), 결과는 홈 팀 기준 `win`, `draw`, `loss`. 형식이 틀린 줄은 건너뛴다.
- 승리 3점, 무승부 1점, 패배 0점. 무승부는 두 팀 모두 무승부 1회다.
- 순위는 승점 내림차순, 승점이 같으면 팀 이름 오름차순.
- 행 형식: 팀 이름 30칸(왼쪽 정렬), 경기 수·승·무·패·승점은 각 2칸(오른쪽 정렬), `" | "`로 연결. 첫 줄은 `header`.

**함수**

- `parse_line`, `format_row`, `tally`: 줄 파싱, 행 출력, 전체 연결
- `record(table, match)`: 경기 하나를 두 팀의 전적(`Stats(won, drawn, lost)`)에 반영
- `points(stats)`: 승점 계산
- `compare_rows(a, b)`: 정렬 기준 (비공개 함수)

```gleam
tally("Allegoric Alaskans;Blithering Badgers;draw\nBlithering Badgers;Courageous Californians;win")
```

```text
Team                           | MP |  W |  D |  L |  P
Blithering Badgers             |  2 |  1 |  1 |  0 |  4
Allegoric Alaskans             |  1 |  0 |  1 |  0 |  1
Courageous Californians        |  1 |  0 |  0 |  1 |  0
```
