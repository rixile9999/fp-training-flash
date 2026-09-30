`append(first, second)`는 `first`의 원소를 앞에서부터 하나씩 새로 만들고, 맨 끝에서 `second`를 **그대로 꼬리로** 씁니다. 불변 목록이라 `second`는 복사할 필요 없이 공유됩니다. 그래서 비용은 `first`의 길이에만 비례합니다(`cost-model-immutable-structures`).

이 비용 모델을 알면 `concat`의 방향이 정해집니다. 앞에서부터 `append(acc, list)`로 누적하면 `acc`가 점점 길어지고, 목록을 하나 합칠 때마다 지금까지 합친 전체를 다시 복사합니다. 작은 목록 k개면 복사량이 1 + 2 + ... + k에 비례해 O(k^2)이 되고, 10만 개에서는 시간 제한을 넘습니다. 대신 `append(list, concat(rest))`처럼 **뒤에서부터** 합치면 각 안쪽 목록은 정확히 한 번 복사되고 나머지는 공유되므로 전체 원소 수에 비례합니다. 이 모양은 `foldr`로 `append`를 접는 것과 같습니다(`fold-universality`).

또 하나의 흔한 실수는 꼬리 재귀로 만들려고 `append(rest, [x, ..second])`처럼 `first`의 원소를 하나씩 `second` 앞으로 옮기는 것입니다. 그러면 `first` 부분이 뒤집혀서 `[1, 2] + [3]`이 `[2, 1, 3]`이 됩니다. 꼬리 재귀가 꼭 필요하다면 `first`를 먼저 뒤집은 뒤 옮겨야 합니다.
