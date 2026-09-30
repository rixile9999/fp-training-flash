각 사람의 검사는 서로 독립이고, 담당자는 틀린 사람을 한 번에 모두 알아야 명단을 고칠 수 있습니다. 그래서 첫 실패에서 멈추는 `list.try_map`이 아니라 **모두 실행한 뒤 나누는** 방식을 씁니다.

1. `list.index_map`으로 사람마다 `validate_all`을 실행하고, 오류 쪽에만 `result.map_error`로 번호(`index + 1`)를 붙입니다. 결과는 `List(Result(NewUser, #(Int, List(SignupError))))`입니다. 성공과 실패의 타입이 모두 같아졌으므로 한 목록에 담을 수 있습니다.
2. `result.partition`으로 성공 값과 오류를 나눕니다. 오류 목록이 비었을 때만 `Ok`입니다.
3. `result.partition`은 두 목록을 **역순**으로 돌려줍니다(표준 라이브러리 문서에 적혀 있습니다). 그래서 둘 다 `list.reverse`합니다.

이 문제는 두 층의 "모든 오류 모으기"를 겹칩니다. 한 사람 안에서는 `validate_all`이 필드 오류를 모으고, 명단 전체에서는 `validate_team`이 사람별 오류를 모읍니다. 낮은 층의 오류(`List(SignupError)`)를 버리지 않고 번호라는 문맥을 덧붙여 높은 층의 오류로 감싸는 것은 **오류도 값이다(errors-as-values)** 주제의 전형적인 모습입니다. 멈추는 연결(`try`)과 모으는 조합(`partition`)의 차이는 **Result 연결과 모나드** 주제에서 다룹니다.

자주 하는 실수:

- `result.partition`의 결과를 그대로 반환해 사람 순서와 오류 순서가 뒤집힌다.
- `list.index_map`의 인덱스를 그대로 써서 번호가 0부터 시작한다.
- `list.try_map`으로 처리해 첫 번째로 틀린 사람만 보고한다.
