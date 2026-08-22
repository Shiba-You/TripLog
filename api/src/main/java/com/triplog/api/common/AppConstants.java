package com.triplog.api.common;

import java.util.UUID;

/**
 * アプリケーション全体で使う定数。
 *
 * <p>MVPは認証なし・単一ユーザー運用のため、全リクエストを db/migration/V2__seed_user.sql
 * でシードした単一ユーザーとして扱う。将来の認証導入時に差し替えやすいよう、シードユーザーIDへの
 * 直接参照は本クラスの定数1箇所に閉じ、Controller/UseCaseからは {@link CurrentUserProvider}
 * 経由でのみ参照させる。
 */
public final class AppConstants {

    public static final UUID SEED_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private AppConstants() {}
}
