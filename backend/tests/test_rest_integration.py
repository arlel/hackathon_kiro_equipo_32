"""REST integration tests with authentication.

Tests the complete flow: register → login → create deck → get history → get stats → edit game.
Uses FastAPI dependency overrides to mock database and auth dependencies.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import create_access_token, get_current_user
from app.core.database import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Fixtures and helpers
# ---------------------------------------------------------------------------

TEST_USER_ID = str(uuid.uuid4())
TEST_USERNAME = "testplayer"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "SecurePass123!"


def _generate_token(user_id: str = TEST_USER_ID, username: str = TEST_USERNAME) -> str:
    """Generate a valid JWT token for testing."""
    return create_access_token({"sub": user_id, "username": username})


def _mock_db_session() -> AsyncMock:
    """Create a mock async database session."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture()
def client() -> TestClient:
    """Create a TestClient with dependency overrides cleared after use."""
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    """Return authorization headers with a valid JWT token."""
    token = _generate_token()
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def mock_db() -> AsyncMock:
    """Override the get_db dependency with a mock session."""
    session = _mock_db_session()

    async def _override_get_db():
        yield session

    app.dependency_overrides[get_db] = _override_get_db
    return session


@pytest.fixture()
def mock_current_user() -> dict:
    """Override the get_current_user dependency to return a fixed user."""
    user = {"id": TEST_USER_ID, "username": TEST_USERNAME}

    async def _override_get_current_user():
        return user

    app.dependency_overrides[get_current_user] = _override_get_current_user
    return user


# ---------------------------------------------------------------------------
# 1. Register a new user (mock DB) — verify 201 response
# ---------------------------------------------------------------------------


class TestRegister:
    """Test user registration endpoint."""

    def test_register_new_user_returns_201(self, client: TestClient, mock_db: AsyncMock) -> None:
        """Register a new user with valid data and expect 201."""
        # Mock: no existing user found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Mock refresh to populate the user object
        mock_db.refresh = AsyncMock()

        with patch("app.api.auth.hash_password", return_value="hashed_pw"):
            response = client.post(
                "/api/auth/register",
                json={
                    "username": TEST_USERNAME,
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert "message" in data

    def test_register_duplicate_user_returns_400(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Register with existing email/username returns 400."""
        # Mock: existing user found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = MagicMock()  # user exists
        mock_db.execute = AsyncMock(return_value=mock_result)

        response = client.post(
            "/api/auth/register",
            json={
                "username": TEST_USERNAME,
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
            },
        )

        assert response.status_code == 400
        assert "ya registrado" in response.json()["detail"]


# ---------------------------------------------------------------------------
# 2. Login with valid credentials — verify JWT token returned
# ---------------------------------------------------------------------------


class TestLogin:
    """Test user login endpoint."""

    def test_login_valid_credentials_returns_token(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Login with correct credentials returns access_token."""
        # Create a mock user object
        mock_user = MagicMock()
        mock_user.id = uuid.UUID(TEST_USER_ID)
        mock_user.username = TEST_USERNAME
        mock_user.email = TEST_EMAIL
        mock_user.password_hash = "hashed_password"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute = AsyncMock(return_value=mock_result)

        with patch("app.api.auth.verify_password", return_value=True):
            response = client.post(
                "/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == TEST_USERNAME
        assert data["user"]["email"] == TEST_EMAIL

    def test_login_invalid_credentials_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Login with wrong password returns 401."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # user not found
        mock_db.execute = AsyncMock(return_value=mock_result)

        response = client.post(
            "/api/auth/login",
            json={"email": TEST_EMAIL, "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "Credenciales inválidas" in response.json()["detail"]


# ---------------------------------------------------------------------------
# 3. Access protected endpoint without token — verify 401
# ---------------------------------------------------------------------------


class TestAuthRequired:
    """Test that protected endpoints reject unauthenticated requests."""

    def test_get_decks_without_token_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Accessing /api/decks without Authorization header returns 401/403."""
        response = client.get("/api/decks/")
        assert response.status_code in (401, 403)

    def test_get_stats_without_token_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Accessing /api/games/stats without token returns 401/403."""
        response = client.get("/api/games/stats")
        assert response.status_code in (401, 403)

    def test_get_history_without_token_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Accessing /api/games/history without token returns 401/403."""
        response = client.get("/api/games/history")
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 4. Create a deck with valid token — verify 201 response structure
# ---------------------------------------------------------------------------


class TestCreateDeck:
    """Test deck creation endpoint with authentication."""

    def test_create_deck_returns_201_with_correct_structure(
        self,
        client: TestClient,
        mock_db: AsyncMock,
        mock_current_user: dict,
    ) -> None:
        """Create a deck with valid payload returns 201 and DeckResponse fields."""
        deck_id = uuid.uuid4()
        created_at = datetime.now(timezone.utc)

        # Mock the deck object that gets returned after commit + refresh
        mock_deck = MagicMock()
        mock_deck.id = deck_id
        mock_deck.name = "Atraxa Superfriends"
        mock_deck.commander_name = "Atraxa, Praetors' Voice"
        mock_deck.commander_image = "https://example.com/atraxa.jpg"
        mock_deck.partner_name = None
        mock_deck.partner_image = None
        mock_deck.format = "commander"
        mock_deck.status = "active"
        mock_deck.created_at = created_at
        mock_deck.last_used_at = None
        mock_deck.user_id = TEST_USER_ID

        # After db.add() and db.commit(), db.refresh() should populate the deck
        async def mock_refresh(obj):
            obj.id = deck_id
            obj.status = "active"
            obj.created_at = created_at
            obj.last_used_at = None

        mock_db.refresh = AsyncMock(side_effect=mock_refresh)

        # Patch the Deck constructor to return our mock deck
        with patch("app.api.decks.Deck", return_value=mock_deck):
            response = client.post(
                "/api/decks/",
                json={
                    "name": "Atraxa Superfriends",
                    "commander_name": "Atraxa, Praetors' Voice",
                    "commander_image": "https://example.com/atraxa.jpg",
                    "format": "commander",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == str(deck_id)
        assert data["name"] == "Atraxa Superfriends"
        assert data["commander_name"] == "Atraxa, Praetors' Voice"
        assert data["format"] == "commander"
        assert data["status"] == "active"
        assert "created_at" in data

    def test_create_deck_without_auth_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Creating a deck without auth token returns 401/403."""
        response = client.post(
            "/api/decks/",
            json={
                "name": "Test Deck",
                "commander_name": "Test Commander",
                "format": "commander",
            },
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 5. Get stats with valid token — verify response has correct fields
# ---------------------------------------------------------------------------


class TestGetStats:
    """Test stats endpoint returns correct structure."""

    def test_get_general_stats_returns_correct_fields(
        self,
        client: TestClient,
        mock_db: AsyncMock,
        mock_current_user: dict,
    ) -> None:
        """Get /api/games/stats returns GeneralStats fields."""
        from app.schemas.stats import GeneralStats

        mock_stats = GeneralStats(
            total_games=10,
            wins=6,
            win_rate=60.0,
            eliminations_by_normal=2,
            eliminations_by_commander=3,
            eliminations_by_poison=1,
        )

        with patch("app.api.games.get_general_stats", return_value=mock_stats):
            response = client.get("/api/games/stats")

        assert response.status_code == 200
        data = response.json()
        assert data["totalGames"] == 10
        assert data["wins"] == 6
        assert data["winRate"] == 60.0
        assert data["eliminationsByNormal"] == 2
        assert data["eliminationsByCommander"] == 3
        assert data["eliminationsByPoison"] == 1

    def test_get_stats_without_auth_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Accessing stats without token is rejected."""
        response = client.get("/api/games/stats")
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 6. Edit a game (mock DB) — verify proper authorization checks
# ---------------------------------------------------------------------------


class TestEditGame:
    """Test game editing with authorization checks."""

    def test_edit_game_user_not_participant_returns_403(
        self,
        client: TestClient,
        mock_db: AsyncMock,
        mock_current_user: dict,
    ) -> None:
        """Editing a game where user is not a participant returns 403."""
        game_id = str(uuid.uuid4())

        # Mock: game exists
        mock_game = MagicMock()
        mock_game.id = uuid.UUID(game_id)

        # First execute: find game -> found
        # Second execute: find user participation -> None (not participant)
        mock_game_result = MagicMock()
        mock_game_result.scalar_one_or_none.return_value = mock_game

        mock_participation_result = MagicMock()
        mock_participation_result.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[mock_game_result, mock_participation_result])

        response = client.put(
            f"/api/games/{game_id}/edit?player_name=rival1",
            json={"elimination_cause": "commander", "elimination_order": 1},
        )

        assert response.status_code == 403
        assert "Sin permisos" in response.json()["detail"]

    def test_edit_game_not_found_returns_404(
        self,
        client: TestClient,
        mock_db: AsyncMock,
        mock_current_user: dict,
    ) -> None:
        """Editing a game that does not exist returns 404."""
        game_id = str(uuid.uuid4())

        # Mock: game not found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result)

        response = client.put(
            f"/api/games/{game_id}/edit?player_name=rival1",
            json={"elimination_cause": "commander", "elimination_order": 1},
        )

        assert response.status_code == 404

    def test_edit_game_success_returns_updated_data(
        self,
        client: TestClient,
        mock_db: AsyncMock,
        mock_current_user: dict,
    ) -> None:
        """Successfully editing a game player returns updated data."""
        game_id = str(uuid.uuid4())
        player_id = uuid.uuid4()

        # Mock game exists
        mock_game = MagicMock()
        mock_game.id = uuid.UUID(game_id)

        # Mock user participation exists
        mock_participation = MagicMock()
        mock_participation.user_id = TEST_USER_ID

        # Mock target player
        mock_player = MagicMock()
        mock_player.id = player_id
        mock_player.game_id = uuid.UUID(game_id)
        mock_player.player_name = "rival1"
        mock_player.elimination_cause = "commander"
        mock_player.elimination_order = 1

        mock_game_result = MagicMock()
        mock_game_result.scalar_one_or_none.return_value = mock_game

        mock_participation_result = MagicMock()
        mock_participation_result.scalar_one_or_none.return_value = mock_participation

        mock_player_result = MagicMock()
        mock_player_result.scalar_one_or_none.return_value = mock_player

        mock_db.execute = AsyncMock(
            side_effect=[
                mock_game_result,
                mock_participation_result,
                mock_player_result,
            ]
        )

        response = client.put(
            f"/api/games/{game_id}/edit?player_name=rival1",
            json={"elimination_cause": "commander", "elimination_order": 1},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["playerName"] == "rival1"
        assert data["eliminationCause"] == "commander"
        assert data["eliminationOrder"] == 1

    def test_edit_game_without_auth_returns_401(
        self, client: TestClient, mock_db: AsyncMock
    ) -> None:
        """Editing a game without auth token is rejected."""
        game_id = str(uuid.uuid4())
        response = client.put(
            f"/api/games/{game_id}/edit?player_name=rival1",
            json={"elimination_cause": "commander", "elimination_order": 1},
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Full flow integration test
# ---------------------------------------------------------------------------


class TestFullFlow:
    """Test the complete auth → create → read flow."""

    def test_register_login_create_deck_flow(self, client: TestClient, mock_db: AsyncMock) -> None:
        """Complete flow: register → login → create deck."""
        # --- Step 1: Register ---
        mock_result_no_user = MagicMock()
        mock_result_no_user.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=mock_result_no_user)

        with patch("app.api.auth.hash_password", return_value="hashed_pw"):
            reg_response = client.post(
                "/api/auth/register",
                json={
                    "username": TEST_USERNAME,
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                },
            )
        assert reg_response.status_code == 201

        # --- Step 2: Login ---
        mock_user = MagicMock()
        mock_user.id = uuid.UUID(TEST_USER_ID)
        mock_user.username = TEST_USERNAME
        mock_user.email = TEST_EMAIL
        mock_user.password_hash = "hashed_password"

        mock_result_login = MagicMock()
        mock_result_login.scalar_one_or_none.return_value = mock_user
        mock_db.execute = AsyncMock(return_value=mock_result_login)

        with patch("app.api.auth.verify_password", return_value=True):
            login_response = client.post(
                "/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        assert token is not None
        assert len(token) > 0

        # --- Step 3: Create deck using token ---
        headers = {"Authorization": f"Bearer {token}"}
        deck_id = uuid.uuid4()
        created_at = datetime.now(timezone.utc)

        mock_deck = MagicMock()
        mock_deck.id = deck_id
        mock_deck.name = "Test Deck"
        mock_deck.commander_name = "Test Commander"
        mock_deck.commander_image = None
        mock_deck.partner_name = None
        mock_deck.partner_image = None
        mock_deck.format = "commander"
        mock_deck.status = "active"
        mock_deck.created_at = created_at
        mock_deck.last_used_at = None

        async def mock_refresh(obj):
            pass

        mock_db.refresh = AsyncMock(side_effect=mock_refresh)

        with patch("app.api.decks.Deck", return_value=mock_deck):
            deck_response = client.post(
                "/api/decks/",
                json={
                    "name": "Test Deck",
                    "commander_name": "Test Commander",
                    "format": "commander",
                },
                headers=headers,
            )

        assert deck_response.status_code == 201
        assert deck_response.json()["name"] == "Test Deck"
