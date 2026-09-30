원래 코드의 `char_value`는 반환 타입이 `Int`라서 "변환에 실패했다"를 표현할 방법이 없습니다. 그래서 `let assert Ok(digit) = int.parse(char)`로 실패를 무시했고, 실패하는 순간 프로그램이 멈췄습니다. `is_valid`는 `String -> Bool`이라는 타입으로 "모든 문자열에 답한다"고 약속하지만, 실제로는 일부 입력에서만 답하는 부분 함수였던 것입니다.

고친 코드는 실패 가능성을 타입에 드러냅니다.

```gleam
fn char_value(char: String, index: Int) -> Result(Int, Nil) {
  case char, index {
    "X", 9 -> Ok(10)
    _, _ -> int.parse(char)
  }
}
```

`is_valid`에서는 `list.index_map(chars, char_value)`로 얻은 `List(Result(Int, Nil))`을 `result.all`로 모읍니다. 모두 `Ok`면 값 목록이 나오고, 하나라도 `Error`면 `Error(Nil)`이 나옵니다. 이 결과를 `case`로 나눠 `Error`일 때 `False`를 돌려주면, 실패가 멈춤이 아니라 평범한 답이 됩니다.

고치면서 흔히 생기는 실수는 두 가지입니다.

- `result.unwrap(int.parse(char), 0)`으로 바꾸는 것. 멈추지는 않지만 잘못된 글자를 0으로 계산하므로, `3-598-P1581-X`처럼 우연히 가중합이 맞는 입력을 `True`로 판정합니다. 멈추는 대신 틀린 답을 내는 셈입니다.
- `char_value`를 다시 쓰면서 `X`를 위치와 상관없이 10으로 받는 것.

`let assert`는 "여기서는 절대 실패하지 않는다"를 증명할 수 있을 때만 씁니다. 사용자 입력처럼 실패가 정상적으로 일어나는 곳에서는 `Result`로 처리합니다. 이 구분은 이론 노트 "전체 함수와 부분 함수"(total-vs-partial-functions)에서 더 다룹니다.
