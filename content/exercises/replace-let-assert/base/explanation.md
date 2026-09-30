원래 함수는 타입으로는 `Result`를 약속하지만, 실제로는 일부 입력에서 값을 돌려주지 못하고 멈춥니다. 이런 함수를 **부분 함수**라고 합니다. 호출하는 쪽은 `Error`를 처리하는 코드를 써 두었어도 그 코드에 도달하지 못합니다(**전체 함수와 부분 함수(total-vs-partial-functions)** 주제).

고친 코드는 `let assert` 두 줄을 같은 자리의 `use ... <- result.try(...)`로 바꿉니다.

- `string.split_once(line, "=")`의 `Error(Nil)`은 `result.replace_error(MissingEquals(line))`로,
- `int.parse(value)`의 `Error(Nil)`은 `result.replace_error(NotANumber(value))`로 바꿉니다.

구조는 그대로이고 "실패하면 멈춘다"가 "실패하면 오류 값을 돌려준다"로 바뀔 뿐입니다. 성공 경로는 여전히 위에서 아래로 읽힙니다(**Result 연결과 모나드** 주제). 이제 모든 입력에 대해 `Ok` 또는 `Error`가 나오므로, 서버는 잘못된 줄을 모아 보여 주거나 그 줄만 건너뛰는 등 스스로 결정할 수 있습니다(**오류도 값이다** 주제).

자주 하는 실수:

- 크래시를 없애려고 `result.unwrap(0)`을 쓴다. 멈추지는 않지만 오타가 난 설정이 조용히 0이 됩니다. 크래시보다 더 찾기 어렵습니다.
- 오류에 줄 전체를 담는다. `NotANumber`에는 문제가 된 값만 담아야 어디를 고칠지 바로 보입니다.
- `string.split(line, "=")`로 나누고 두 조각만 허용한다. `"query=a=b"`는 `=`가 있는 줄이므로 `MissingEquals`가 아니라 값 `"a=b"`의 문제입니다.
