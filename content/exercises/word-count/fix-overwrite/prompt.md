`tally`는 공백으로 나뉜 단어의 등장 횟수를 세는 함수입니다. 그런데 어떤 문장을 넣어도 모든 단어의 횟수가 1로 나옵니다. 버그를 고치세요.

- `tally(input)`: 소문자로 바꾸고 공백으로 나눈 단어마다 `increment`를 적용해 `Dict(String, Int)`를 만든다. (이 함수는 수정할 필요가 없다)
- `increment(counts, word)`: `word`가 이미 있으면 횟수에 1을 더하고, 없으면 1로 추가한다. 다른 단어의 횟수는 그대로 둔다.

```gleam
tally("fish one fish two fish")
// 기대: dict.from_list([#("fish", 3), #("one", 1), #("two", 1)])
// 현재: dict.from_list([#("fish", 1), #("one", 1), #("two", 1)])
```
