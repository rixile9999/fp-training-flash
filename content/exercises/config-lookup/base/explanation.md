`dict.get`과 `int.parse`는 모두 `Result(_, Nil)`을 돌려줍니다. "실패했다"는 사실만 있고 이유가 없으니, 그대로 이어 붙이면 "키가 없다"와 "값이 이상하다"를 구분할 수 없습니다. 그래서 해답은 **단계마다** `result.replace_error`로 이 문제의 오류를 붙입니다. `dict.get` 뒤에는 `MissingKey(key)`, `int.parse` 뒤에는 `NotAnInt(key, value)`입니다. 두 오류는 운영자가 해야 할 일이 다릅니다(키를 추가할지, 값을 고칠지).

`use value <- result.try(...)`는 "성공하면 값을 꺼내 다음 줄로, 실패하면 함수 전체를 그 오류로 끝낸다"는 뜻입니다. `get_port`도 같은 방식으로 `get_int`의 결과를 이어 받아 범위만 검사합니다. 오류 처리를 다시 쓰지 않아도 `get_int`의 오류가 그대로 전달됩니다. 이 연결 방식이 **Result 연결과 모나드(chaining-results-monads)** 주제의 내용이고, 실패를 반환값으로 드러내는 설계는 **오류도 값이다(errors-as-values)** 주제입니다.

자주 하는 실수:

- `dict.get(...) |> result.try(int.parse) |> result.replace_error(MissingKey(key))`처럼 마지막에 한 번만 오류를 바꾼다. 짧아 보이지만 값이 잘못된 경우도 `MissingKey`가 됩니다.
- `get_port`에서 `result.unwrap(get_int(...), 0)`으로 값을 꺼낸다. 원래 오류가 사라지고 "포트 0이 범위 밖"이라는 엉뚱한 오류가 보고됩니다.
- 상한을 `<`로 적어 65535를 거부한다.
