프로그램이 `parse_line → record → points/compare_rows → format_row`로 나뉘어 있으므로, 실패한 테스트가 부르는 함수부터 의심하면 버그 위치가 빨리 좁혀집니다. 순수 함수는 입력만 같으면 어디서 부르든 같은 값을 내므로, 단계 하나를 따로 호출한 결과를 믿고 다음 단계로 넘어갈 수 있습니다(이론 주제 "참조 투명성").

**버그 1: `record`의 무승부.** `Draw` 갈래가 홈 팀만 갱신했습니다. 경기는 항상 두 팀의 전적을 바꾸므로 원정 팀도 `Draw`로 갱신합니다. 기본 문제의 풀이처럼 결과를 `#(홈 관점, 원정 관점)` 쌍으로 먼저 바꾸고 두 팀을 한 번씩 갱신하는 구조로 바꾸면, 갈래마다 갱신 코드를 반복하다 한쪽을 빠뜨리는 실수 자체를 막을 수 있습니다.

**버그 2: `points`의 공식.** `stats.won * 3 + stats.lost`는 패배에 점수를 줍니다. `stats.won * 3 + stats.drawn`이 맞습니다. 이름이 비슷한 필드를 쓰는 곳은 테스트에서 값이 서로 다른 입력(예: `Stats(2, 1, 3)`)으로 확인해야 드러납니다.

**버그 3: 정렬 방향.** `int.compare(points(a.1), points(b.1))`는 오름차순입니다. 인자 순서를 바꿔 `int.compare(points(b.1), points(a.1))`로 고치고, 이름 비교(`string.compare(a.0, b.0)`)는 그대로 둡니다.

흔한 잘못된 수정은 `list.sort(order.reverse(compare_rows))`입니다. 승점은 내림차순이 되지만 동점일 때의 이름 순서까지 뒤집혀 `Courageous`가 `Allegoric`보다 앞에 옵니다. 정렬 기준이 여러 개이면 뒤집을 기준만 골라 뒤집어야 합니다.

*원본: Exercism Gleam 트랙 `tournament` (MIT, Copyright (c) 2021 Exercism). 버그 수정 문제로 다시 구성했습니다.*
