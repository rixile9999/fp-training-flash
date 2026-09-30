정답은 `[6, 5, 5]`입니다.

```gleam
"  Hello, Gleam World  "
|> string.trim             // "Hello, Gleam World"
|> string.lowercase        // "hello, gleam world"
|> string.split(" ")       // ["hello,", "gleam", "world"]
|> list.map(string.length) // [6, 5, 5]
```

`string.trim`이 양 끝 공백을 먼저 지웠기 때문에 `split`의 결과에 빈 문자열이 생기지 않습니다. 순서를 바꿔 `split`을 먼저 했다면 `["", "", "Hello,", ...]`처럼 빈 조각이 섞였을 것입니다. 파이프라인에서 단계의 순서는 결과를 바꿉니다(이론 주제 "함수 합성과 파이프라인").

흔한 실수는 쉼표를 잊고 `"hello"`의 길이 5로 세어 `[5, 5, 5]`라고 답하는 것입니다. `split`은 구분자(공백)로 나눌 뿐 구두점을 지우지 않으므로 첫 조각은 `"hello,"`(6글자)입니다.
