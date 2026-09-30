이 문제의 핵심은 "없음"과 "잘못됨"을 다른 값으로 표현하는 것입니다. 반환 타입 `Result(Option(Int), ConfigError)`가 세 경우를 모두 담습니다.

| 상황 | 값 |
|---|---|
| 정수가 적혀 있음 | `Ok(Some(n))` |
| 키가 없음(선택 설정이므로 정상) | `Ok(None)` |
| 적혀 있지만 정수가 아님 | `Error(NotAnInt(key, value))` |

`get_optional_int`는 `dict.get`의 결과를 먼저 `case`로 나눕니다. 키가 없을 때만 `None`이고, 키가 있으면 반드시 `int.parse`를 거칩니다. `get_int_or`는 이 결과를 그대로 받아 `result.map(option.unwrap(_, default))`로 **`Ok` 안의 `None`에만** 기본값을 채웁니다. `Error`는 `result.map`을 통과하지 않으므로 잘못된 값은 끝까지 오류로 남습니다. 규칙을 한 곳(`get_optional_int`)에만 두고 재사용했기 때문에 두 함수의 동작이 어긋날 일이 없습니다.

잘못된 설정을 기본값으로 바꾸면 프로그램은 조용히 다른 설정으로 돌아갑니다. 운영자는 자기가 적은 값이 쓰이고 있다고 믿게 됩니다. 실패를 값으로 드러내 호출하는 쪽이 판단하게 하는 것이 **오류도 값이다(errors-as-values)** 주제의 요점입니다.

자주 하는 실수:

- `dict.get(...) |> result.try(int.parse) |> result.unwrap(default)`. 두 실패가 `Error(Nil)` 하나로 합쳐진 뒤 둘 다 기본값이 됩니다.
- `option.from_result`로 `Result`를 `Option`으로 바꾼다. 같은 이유로 잘못된 값이 `None`이 됩니다.
- 빈 문자열을 "없음"으로 취급한다. 키가 있다는 사실은 누군가 값을 적으려 했다는 뜻입니다.
