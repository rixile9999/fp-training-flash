글자 하나를 변환하는 규칙은 네 가지 성공과 "그 밖의 글자는 실패" 하나입니다. 이 규칙을 `complement(nucleotide) -> Result(String, Nil)` 함수로 분리하면, 실패할 수 있다는 사실이 반환 타입에 드러나고 규칙만 따로 확인할 수 있습니다.

전체 가닥은 "모든 글자가 성공해야 성공"입니다. 이것이 `list.try_map`의 정의와 같습니다.

```gleam
dna
|> string.to_graphemes
|> list.try_map(complement)      // Result(List(String), Nil)
|> result.map(string.concat)     // Result(String, Nil)
```

`try_map`은 첫 `Error`를 만나면 멈추고 그 `Error`를 돌려줍니다. 모두 성공했을 때만 변환된 목록이 `Ok`로 나오므로, 마지막 이어 붙이기는 성공한 경우에만 하도록 `result.map`으로 연결합니다. 빈 문자열은 글자가 없으니 실패할 글자도 없어 `Ok("")`가 됩니다.

가장 흔한 실수는 `list.filter_map`을 쓰는 것입니다. `filter_map`은 실패한 원소를 **버리고** 나머지만 남기므로, `"ACGTX"`가 `Ok("UGCA")`가 되어 잘못된 입력이 멀쩡한 결과처럼 보입니다. "실패를 걸러낸다"와 "실패를 알린다"는 전혀 다른 요구입니다.

입력을 먼저 대문자로 바꾸는 것도 규칙을 넓히는 실수입니다. 문제는 대문자 네 글자만 올바른 입력으로 정했으므로, 소문자는 조용히 고치지 말고 오류로 알려야 합니다.

잘못된 입력을 결과 타입으로 알리는 설계는 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
