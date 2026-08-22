package com.triplog.api.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurrentUserProviderTest {

    private final CurrentUserProvider currentUserProvider = new CurrentUserProvider();

    @Test
    void 常にシードユーザーIDを返す() {
        UUID userId = currentUserProvider.getCurrentUserId();

        assertThat(userId).isEqualTo(AppConstants.SEED_USER_ID);
    }

    @Test
    void 複数回呼び出しても同一の値を返す() {
        UUID first = currentUserProvider.getCurrentUserId();
        UUID second = currentUserProvider.getCurrentUserId();

        assertThat(first).isEqualTo(second);
    }
}
