이 문제는 한 번에 풀면 긴 함수 하나가 되기 쉽지만, 데이터 모양이 바뀌는 지점마다 자르면 각 조각은 짧습니다.

```text
String ─split→ List(String) ─filter_map(parse_line)→ List(Match)
       ─fold(record)→ Dict(String, Stats) ─to_list→ List(#(String, Stats))
       ─sort(compare_rows)→ ─map(format_row)→ List(String) ─join→ String
```

`tally`는 이 흐름을 파이프로 그대로 적은 것입니다(이론 주제 "함수 합성과 파이프라인"). 각 단계가 순수 함수라서 테스트도 단계별로 할 수 있습니다.

**파싱.** `case string.split(line, ";")`에서 `[home, away, "win"]`처럼 리스트 패턴과 문자열 리터럴을 함께 매칭하면, 필드 수 검사와 결과 문자열 검사가 한 번에 끝납니다. 결과를 `Outcome` 타입으로 바꿔 두면 이후 단계는 문자열 오타를 걱정하지 않아도 됩니다(이론 주제 "합 타입과 빠짐없는 분기"). 원본 Exercism 풀이처럼 나머지를 모두 `Draw`로 처리하면 `tie` 같은 잘못된 줄이 무승부로 기록됩니다.

**전적 갱신.** 경기 결과는 홈 팀 기준이므로, 먼저 `#(홈 관점 결과, 원정 관점 결과)` 쌍으로 바꿉니다(`Loss -> #(Loss, Win)`). 그다음 두 팀에 같은 `add_result` 함수를 적용하면 "원정 팀도 갱신"을 빠뜨리거나 관점을 헷갈릴 일이 줄어듭니다. 경기 목록 전체는 `list.fold(dict.new(), record)`로 접습니다(이론 주제 "fold의 보편성").

**정렬.** `int.compare(points(b.1), points(a.1))`는 인자 순서를 바꿔 내림차순을 만들고, `order.break_tie`는 승점이 같을 때만 이름 비교를 씁니다. `dict.to_list`의 순서는 보장되지 않으므로 이름 순서도 명시적으로 정렬해야 합니다.

**출력.** 팀 이름은 `string.pad_end`(왼쪽 정렬), 숫자는 `string.pad_start`(오른쪽 정렬)입니다. 이 둘을 바꾸면 모든 행이 어긋납니다.

흔한 실수: `loss`를 홈 팀의 패배로만 기록하고 원정 팀에도 패배를 주는 복사·붙여넣기 실수, 알 수 없는 결과를 무승부로 처리하는 것, 팀 이름을 오른쪽 정렬하는 것.

*원본: Exercism Gleam 트랙 `tournament` (MIT, Copyright (c) 2021 Exercism). 도우미 함수 분리, 잘못된 줄 처리 규칙을 더해 다시 구성했습니다.*
