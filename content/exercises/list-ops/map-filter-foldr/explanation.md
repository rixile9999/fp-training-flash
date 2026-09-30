`foldr`은 `[first, ..rest]`에서 `rest`를 **먼저** 접고, 그 결과에 `first`를 합칩니다. 그래서 `function`이 처음 호출되는 원소는 마지막 원소이고, `"abc"`를 문자열 이어 붙이기로 접으면 `"cba"`가 됩니다.

이 방향이 `map`과 `filter`에 딱 맞습니다. 결과 목록은 뒤에서부터 완성되고, 각 원소는 이미 완성된 꼬리 **앞에** 붙기만 하면 됩니다. 앞에 붙이기는 O(1)이므로 전체가 O(n)이고, 순서도 그대로입니다. `map`과 `filter`가 모두 "빈 목록에서 시작해 앞에 붙이는 foldr"로 표현된다는 것은 fold가 목록 재귀의 공통 뼈대라는 뜻입니다(`fold-universality`, `structural-recursion-induction`).

흔한 실수 두 가지:

- 꼬리 재귀로 앞에서부터 누적하며 `[function(x), ..acc]`로 붙이고 끝에서 뒤집지 않으면 결과 순서가 거꾸로 됩니다. 꼬리 재귀를 쓰려면 마지막에 한 번 뒤집어야 합니다(`accumulators-and-tail-recursion`).
- 순서를 지키려고 `append(acc, [function(x)])`처럼 누적 결과 **뒤에** 붙이면 결과는 맞지만 매번 누적 목록 전체를 복사해서 O(n^2)입니다. 20만 개에서는 시간 제한을 넘습니다(`cost-model-immutable-structures`).

BEAM에서는 `foldr`처럼 꼬리 재귀가 아닌 재귀도 스택이 힙처럼 자라서 긴 목록에서 넘치지 않습니다. 그래서 이 문제에서는 뒤집기가 필요 없는 `foldr` 방식이 가장 간단합니다.
