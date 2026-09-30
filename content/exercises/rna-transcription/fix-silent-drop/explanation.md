`list.filter_map(complement)`은 `complement`가 `Error`를 돌려준 글자를 **버리고** 나머지를 모읍니다. 그 뒤에 무조건 `Ok`로 감싸므로, 어떤 입력이 와도 결과는 `Ok`입니다. 잘못된 글자가 있다는 사실이 사라지고, 호출한 쪽은 짧아진 서열을 올바른 결과로 믿게 됩니다.

고친 코드는 "모두 성공해야 성공"을 뜻하는 `list.try_map`을 쓰고, 이어 붙이기는 성공한 경우에만 `result.map`으로 합니다.

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)
|> result.map(string.concat)
```

고치면서 생기기 쉬운 잘못된 수정도 있습니다.

- 결과가 빈 문자열이면 `Error`로 바꾸기: 모든 글자가 잘못된 경우만 잡고, 일부만 잘못된 경우는 여전히 놓칩니다. 게다가 올바른 빈 입력 `""`까지 오류가 됩니다. 결과를 보고 실패를 추측하는 대신 실패가 일어난 그 자리에서 전달해야 합니다.
- `result.unwrap(complement(c), c)`로 잘못된 글자를 그대로 두기: 길이는 맞지만 `"ACXT"`가 `Ok("UGXA")`처럼 보여 오류가 결과 속에 숨습니다.

`filter_map`, `unwrap`처럼 실패를 흡수하는 함수는 "실패한 원소를 무시해도 된다"는 요구가 있을 때만 씁니다. 실패를 결과 타입으로 전달하는 설계는 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
