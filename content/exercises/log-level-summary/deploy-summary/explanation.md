여러 로그를 한 장의 요약으로 줄이는 일이므로 `list.fold`를 쓰고, 누적값으로 `Summary` 레코드를 그대로 씁니다. 빈 요약 `Summary(0, 0, 0, None)`이 초기값이고, 로그 하나를 반영하는 `add_entry(summary, entry) -> Summary`가 접는 함수입니다.

`add_entry`는 먼저 모든 로그에 공통인 `total`을 늘린 뒤, `case entry.level`로 레벨별 필드를 늘립니다. `Level`이 합 타입이므로 컴파일러가 네 레벨을 모두 다뤘는지 확인해 줍니다(이론 노트 "합 타입과 빠짐없는 분기"). 공통 갱신을 `case` 밖으로 빼 두면, 분기 하나에서 `total`을 빠뜨리는 실수가 구조적으로 생기지 않습니다. 흔한 실수가 바로 그것으로, `Debug -> summary`처럼 "관심 없는 레벨은 그냥 넘긴다"고 쓰면 전체 수에서 디버그 로그가 빠집니다.

`first_critical`은 "처음 것만" 기록해야 합니다. `option.or(summary.first_critical, Some(entry.message))`는 이미 값이 있으면 그것을, 없으면 새 메시지를 고릅니다. 매번 `Some(entry.message)`로 덮어쓰면 마지막 치명 로그가 남습니다. 접기는 앞에서부터 한 번씩 방문하므로, "처음"과 "마지막"의 차이는 덮어쓸지 말지에서 결정됩니다(이론 노트 "fold의 보편성, 목록 재귀의 공통 뼈대").
