package com.triplog.api.common;

import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * 「現在のユーザーID」を解決する唯一の窓口。
 *
 * <p>MVPは認証なしのためシードユーザーIDを常に返すが、将来の認証導入（Bearer/JWT等）時は
 * このクラスの実装だけを差し替えればよい構成にする（Controller/UseCase側の変更は不要）。
 */
@Component
public class CurrentUserProvider {

    public UUID getCurrentUserId() {
        return AppConstants.SEED_USER_ID;
    }
}
