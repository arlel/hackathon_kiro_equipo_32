# Requirements Document

## Introduction

MTG Life Counter is a multiplayer web application for tracking life points in Magic: The Gathering games. It allows players to create rooms with shareable codes, synchronize life counters in real time via WebSockets, search and integrate commander art from Scryfall, and maintain a complete game history with statistics. It supports game formats (Commander with 40 life, 20 life standard, and Custom with configurable life), optional poison counters, and a local room mode for use without multiple accounts. It includes random starting player selection with animation, automatic detection of the last player standing, elimination cause tracking, editable game history, commander/deck registry, optional turn counter, and CSV statistics export. It is designed to work on mobile and desktop devices, allowing up to 12 players connected simultaneously per room.

## Glossary

- **System**: The MTG Life Counter application as a whole (frontend + backend)
- **Server**: The FastAPI backend that manages WebSockets, authentication, and persistence
- **Client**: The React application in the player's browser
- **Room**: A game instance identified by a unique 6-character alphanumeric code
- **Local_Room**: A room created by a single authenticated user where additional players are added locally without needing their own accounts
- **Player**: A participant within an active room
- **Local_Player**: A participant without their own account, added by the creator of a Local_Room
- **Life_Counter**: The component that displays and allows modification of a player's life points
- **Poison_Counter**: The component that displays and allows modification of a player's poison counters when enabled in the room configuration
- **Commander_Damage**: The record of combat damage dealt by each commander to each player
- **Room_Manager**: The server module that manages room state and WebSocket communication
- **Scryfall_Service**: The integration service with the Scryfall API for card search
- **Auth_Engine**: The module that manages registration, login, and JWT tokens
- **History_Module**: The component that stores and queries completed games
- **Statistics_Module**: The component that calculates and presents player statistics
- **Starting_Player_Selector**: The component that randomly selects a player to start the game through a visual animation
- **Elimination_Cause**: The record of the reason a player was eliminated from the game (normal damage, commander damage, or poison)
- **Commander_Registry**: The module that stores and queries commanders/decks used by each user across all their games
- **History_Editor**: The panel that allows an authenticated user to correct data from completed games (elimination cause and elimination order)
- **CSV_Exporter**: The component that generates CSV files from the user's statistics tables
- **Deck_Collection**: The module that allows the user to register, query, and manage their personal decks ("My Decks") to reuse them when joining games
- **Deck**: An entry in the user's personal collection that identifies a deck by its commander (Commander format) or by a custom name (other formats), with associated format and status
- **Partner**: An ability of certain legendary Magic cards that allows a player to designate two commanders instead of just one
- **Partner_Pair**: A pair of legendary cards with the Partner ability designated as co-commanders of the same deck
- **Deck_Statistics**: The metrics calculated for each registered deck: total games, wins, win percentage, and players who have used that deck
- **Rival_Statistics**: The metrics calculated for each rival the user has played against: total games, wins, win percentage
- **Game_Record**: A row in the game log that includes date, players, decks used, and elimination position of each player

## Requirements

### Requirement 1: Room Creation

**User Story:** As a player, I want to create a game room with a unique code, so that other players can join my game.

#### Acceptance Criteria

1. WHEN a player selects "Create Room", THE System SHALL generate a unique 6-character code composed exclusively of uppercase letters (A-Z) and digits (0-9), and verify that no active room exists with the same code before assigning it
2. WHEN a player creates a room, THE System SHALL present a game format selector with the options Commander (40 life), 20 life, and Custom (where the user enters a custom initial life value), with Commander being the default selected format
3. WHEN the room is created, THE System SHALL redirect the player to the game screen with the room code pre-filled within a maximum of 2 seconds
4. WHEN a player creates a room with a selected format, THE System SHALL assign the initial life corresponding to the format: 40 for Commander, 20 for the "20 life" option, and the user-entered value for Custom
5. THE System SHALL allow a maximum of 12 players connected simultaneously per room
6. WHEN a player creates a room, THE System SHALL present a configurable option to enable or disable poison counters, disabled by default
7. WHEN a player creates a room, THE System SHALL present a configurable option to enable or disable the turn counter, disabled by default

### Requirement 2: Joining Rooms

**User Story:** As a player, I want to join an existing room by entering a code, so that I can participate in a game with other players.

#### Acceptance Criteria

1. WHEN a player enters a room code of exactly 6 uppercase alphanumeric characters that corresponds to an existing room, THE System SHALL allow access to the room and display the player data entry form
2. IF a player enters a room code with invalid format or that does not correspond to an existing room, THEN THE System SHALL display an error message indicating that the room was not found and remain on the join screen
3. WHEN a player joins a room, THE System SHALL request a mandatory player name with a length between 1 and 30 characters
4. WHEN the room format is Commander, THE System SHALL present a commander search that allows searching for legendary cards by name before confirming the join
5. WHEN a player completes the required data and selects "Join", THE Client SHALL establish a WebSocket connection with the Server within a maximum of 5 seconds
6. IF the WebSocket connection fails or is not established within 5 seconds, THEN THE System SHALL display a connection error indicator and allow the player to retry joining
7. IF a player attempts to join without providing a name, THEN THE System SHALL disable the join button

### Requirement 3: Real-Time Synchronization

**User Story:** As a player, I want life changes to synchronize instantly between all devices, so that all players see the updated game state.

#### Acceptance Criteria

1. WHEN a player connects to a room, THE Server SHALL send the complete room state (current life of each player, commander damage, connection status, commander name and image, and turn counter if enabled) to all connected players within a maximum of 2 seconds from connection
2. WHEN a player adjusts life points, THE Client SHALL send the action to the Server via WebSocket and the Server SHALL retransmit the updated state to all connected players within a maximum of 1 second from receiving the action
3. IF the Client does not have an active WebSocket connection when attempting to send an action, THEN THE Client SHALL queue the action locally and retry sending for a maximum of 3 attempts with 2-second intervals between each attempt
4. WHILE a player is connected to a room, THE Client SHALL display a visual connection status indicator (green for connected, red for error, pulsing yellow for connecting)
5. IF a player disconnects (WebSocket connection closure or absence of response for 30 seconds), THEN THE Server SHALL mark the player as disconnected and notify the other players within a maximum of 5 seconds
6. WHEN a previously disconnected player reconnects to the same room within 30 minutes of disconnection, THE Server SHALL restore the player's complete state (life, accumulated commander damage, and commander name) and retransmit the updated state to all connected players
7. IF a player does not reconnect within 30 minutes of disconnection, THEN THE Server SHALL maintain the player's data in the room with disconnected status until the room is deleted due to inactivity
8. IF the room reaches the maximum number of 12 simultaneously connected players, THEN THE Server SHALL reject new connections and indicate to the Client that the room is full

### Requirement 4: Life Counter

**User Story:** As a player, I want to increment or decrement life points of any player, so that I can track life changes during the game.

#### Acceptance Criteria

1. THE Life_Counter SHALL display the current life points of each player in numeric format with a minimum font size of 48px
2. THE Life_Counter SHALL provide increment (+1) and decrement (-1) buttons for each player, with a minimum touch area of 44x44px
3. WHEN a player presses the increment button, THE System SHALL add 1 life point to the target player and transmit the new state to all connected players in the room within a maximum of 2 seconds
4. WHEN a player presses the decrement button, THE System SHALL subtract 1 life point from the target player and transmit the new state to all connected players in the room within a maximum of 2 seconds
5. WHEN a player long-presses (500 milliseconds or more) the increment button, THE System SHALL add 10 life points to the target player and transmit the new state to all connected players in the room
6. WHEN a player long-presses (500 milliseconds or more) the decrement button, THE System SHALL subtract 10 life points from the target player and transmit the new state to all connected players in the room
7. THE System SHALL allow life points to be any integer value with no lower or upper limit
8. THE Client SHALL organize visible players in a responsive grid of 1 column on screens with width less than 640px and 2 columns on screens with width equal to or greater than 640px, displaying a maximum of 6 players visible simultaneously with scrolling or pagination capability to access remaining players
9. WHEN a player joins the room, THE System SHALL initialize their life points with the value corresponding to the game format (Commander: 40, 20 life: 20, Custom: value configured by the creator)
10. IF the target player does not exist in the room, THEN THE System SHALL ignore the life adjustment action and not modify any player's state

### Requirement 5: Commander Search via Scryfall

**User Story:** As a Commander player, I want to search for my commander by name and see its art as a background, so that the gaming experience is visually attractive and personalized.

#### Acceptance Criteria

1. WHEN a player types at least 2 characters in the commander search field, THE Scryfall_Service SHALL query the Scryfall API with the `is:commander` filter after a 300-millisecond debounce, canceling any pending previous query to prevent stale results from overwriting more recent results
2. WHEN Scryfall returns results, THE Client SHALL display a dropdown list with a maximum of 20 results showing thumbnail image, name, and color identity, and close the list when clicking outside the component or pressing the Escape key
3. WHEN a player selects a commander from the list, THE Client SHALL store in the component state the name and art_crop URL of the card, and display a preview with the thumbnail image, name, and color identity below the search field
4. WHEN a player selects a commander whose card contains the "Partner" ability in its oracle text, THE Client SHALL display a second commander search field with the label "Partner (optional)" allowing searching and selecting a second commander with the same Scryfall search mechanics
5. WHEN a player selects a second partner commander, THE Client SHALL store both names and art_crop URLs in the component state as a Partner_Pair
6. WHILE a player has a selected commander (individual or partner pair) with a valid art_crop URL, THE Client SHALL display the art of the first selected commander as the player panel background image with a dark overlay at 60% opacity, scaling the image to cover the entire panel without distortion
7. WHEN the selected card is a double-faced card without image_uris at the root level, THE Scryfall_Service SHALL obtain the image from the first face in the card_faces array
8. IF the Scryfall API returns an HTTP 404 status code or a network error, THEN THE Scryfall_Service SHALL return an empty list without showing error messages to the user and without affecting game functionality
9. IF the art_crop URL of the selected commander does not load correctly, THEN THE Client SHALL display the player panel with the default background color assigned by position, maintaining all panel functionality intact

### Requirement 6: Commander Damage

**User Story:** As a Commander player, I want to track combat damage dealt by each commander to each player, so that I can determine when a player is eliminated by commander damage (21 points) and that damage is automatically reflected in the affected player's life.

#### Acceptance Criteria

1. IF the game format is Commander, THEN THE Client SHALL display a "Commander Damage" button on each player's panel
2. WHEN a player activates the commander damage panel of a target player, THE Client SHALL display the list of all other players as commander damage sources; if a source player has a Partner_Pair, THE Client SHALL display each commander in the pair as an independent damage source with its own accumulated damage value (initialized at 0) and increment (+1) and decrement (-1) controls
3. WHEN a player increments commander damage from a specific source (individual commander or one of a partner pair) on a target player, THE System SHALL send the action with the source commander identifier, target player, and amount (+1) to the Server via WebSocket, and the Server SHALL automatically reduce the target player's life by the same amount
4. WHEN a player decrements commander damage from a specific source on a target player, THE System SHALL send the action with the source commander identifier, target player, and amount (-1) to the Server via WebSocket, and the Server SHALL automatically increment the target player's life by the same amount
5. WHEN a player long-presses (500 milliseconds or more) the commander damage increment button, THE System SHALL send the action with amount +10 to the Server via WebSocket, and the Server SHALL automatically reduce the target player's life by 10
6. WHEN a player long-presses (500 milliseconds or more) the commander damage decrement button, THE System SHALL send the action with amount -10 to the Server via WebSocket, and the Server SHALL automatically increment the target player's life by 10
7. THE Server SHALL maintain a commander damage record for each commander-source and target-player pair (where a player with partners generates two independent commander-source entries), initialized at 0 when each player joins the room
8. IF a commander damage action would result in a value less than 0, THEN THE Server SHALL set the value to 0 instead of applying the decrement, without modifying the target player's life
9. WHEN the Server receives a valid commander damage action, THE Server SHALL update the corresponding pair record, apply the life adjustment to the target player, and retransmit the complete updated state to all connected players in the room within 2 seconds
10. WHEN the accumulated commander damage from a single commander-source (individual or one of a partner pair) on a player reaches or exceeds 21 points, THE Client SHALL display a visual elimination indication due to commander damage on the affected player's panel, identifying which commander caused the elimination

### Requirement 7: User Accounts

**User Story:** As a player, I want to create an account and authenticate, so that my games are recorded and I can check my history.

#### Acceptance Criteria

1. WHEN a user submits the registration form with username (between 3 and 50 characters), valid email (maximum 255 characters), and password (minimum 6 characters), THE Auth_Engine SHALL create a new account with the hashed password and confirm successful creation
2. IF a user attempts to register with an email or username that already exists, THEN THE Auth_Engine SHALL reject the registration indicating that the email or username is already in use
3. IF a user submits the registration form with fields that do not meet the length or email format restrictions, THEN THE Auth_Engine SHALL reject the registration indicating which field is invalid
4. WHEN a user submits valid credentials in the login form, THE Auth_Engine SHALL generate a JWT token with an expiration of 1440 minutes and return it to the Client along with the user's basic data
5. IF a user submits invalid credentials (unregistered email or incorrect password), THEN THE Auth_Engine SHALL respond with an authentication error without revealing whether the failure was due to email or password
6. WHEN the Client receives a JWT token after successful login, THE Client SHALL store the token in the browser's localStorage to maintain the session active between page reloads
7. IF the JWT token has expired or is invalid when making an authenticated request, THEN THE Auth_Engine SHALL reject the request with an error indicating that the token is invalid or has expired
8. THE System SHALL allow gameplay without authentication (as a guest player) with full access to game functions, reserving history recording and statistics consultation exclusively for authenticated users

### Requirement 8: Game History

**User Story:** As an authenticated player, I want to see the history of my previous games, so that I can review results and track my progress.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the history section, THE History_Module SHALL query all games in which the user participated, ordered by completion date descending, and display a maximum of 50 games
2. WHEN the history is displayed to the user, THE History_Module SHALL show for each game: game format, completion date, list of players with username, result indicating the winner with a crown emoji (👑) next to their name, and the elimination cause of each eliminated player
3. WHEN the history is displayed to the user and the game had the turn counter enabled, THE History_Module SHALL display the game's turn count as an integer numeric value
4. WHEN a game ends with the "end_game" action, THE Server SHALL persist the final game state including: final life of each player (integer value), commander damage received by each player (broken down by source), winner identifier, total turn count (if enabled), elimination cause of each eliminated player, and elimination order of the players
5. IF an unauthenticated user accesses the history, THEN THE Client SHALL display an empty list without error messages
6. IF the server query fails when loading history, THEN THE History_Module SHALL maintain the empty list and log the error to console without displaying error messages to the user
7. WHEN the history is loading from the server, THE History_Module SHALL display a textual loading indicator until the response is received or 10 seconds of waiting have elapsed

### Requirement 9: Player Statistics

**User Story:** As an authenticated player, I want to see my game statistics broken down by deck and by rival, so that I can understand my performance, identify dominant decks, and analyze matchups against other players.

#### Acceptance Criteria

1. WHEN an authenticated user requests their general statistics, THE Statistics_Module SHALL calculate and return within a maximum of 2 seconds: total completed games played, total wins, win percentage, and win breakdown by elimination cause (normal damage, commander damage, poison)
2. THE Statistics_Module SHALL calculate win percentage as (wins / total completed games) multiplied by 100, rounded to one decimal place
3. IF a user has no completed games recorded, THEN THE Statistics_Module SHALL return zero for total games, zero for total wins, and zero point zero for win percentage
4. IF an unauthenticated user or one with an invalid token requests statistics, THEN THE Statistics_Module SHALL reject the request with an error message indicating that authentication is required
5. THE Statistics_Module SHALL consider only completed games (with a recorded completion date) for calculating all metrics, excluding active or in-progress games
6. THE Statistics_Module SHALL calculate and display statistics of eliminations received by the user broken down by cause: total eliminations by normal damage (life reached 0), total eliminations by commander damage (21 or more from a single source), and total eliminations by poison (10 or more counters)
7. WHEN an authenticated user requests statistics by deck, THE Statistics_Module SHALL calculate for each Deck registered in the user's Deck_Collection: total games played, total wins, win percentage, and list of players who have used that same deck in shared games
8. WHEN an authenticated user requests statistics by rival, THE Statistics_Module SHALL calculate for each player the user has played against: rival name, total games played together, user's wins against that rival, and user's win percentage against that rival
9. WHEN an authenticated user requests the game log, THE Statistics_Module SHALL display a table with each completed game including: date, list of participating players, deck used by each player (if applicable), and elimination position of each player (allowing shared positions in case of ties)
10. THE Statistics_Module SHALL sort rival statistics by total games played together in descending order
11. THE Statistics_Module SHALL sort deck statistics by win percentage in descending order

### Requirement 10: Turn Management

**User Story:** As a player, I want to optionally enable a game turn counter, so that I can have a temporal reference of game progress when I need it.

#### Acceptance Criteria

1. WHILE the turn counter is enabled in the room configuration, WHEN a player connected to the room sends the "increment_turn" action, THE Server SHALL increment the room's turn counter by 1 and broadcast the updated state to all connected players in the room
2. WHILE the turn counter is enabled in the room, THE Server SHALL include the turn count field as a non-negative integer in each state update sent to the room's players
3. WHEN the room is created with the turn counter enabled, THE Server SHALL initialize the turn counter at 0
4. IF a player sends the "increment_turn" action and does not belong to any active room, THEN THE Server SHALL discard the action without modifying any turn counter
5. WHILE the turn counter is disabled in the room configuration, THE Client SHALL hide the turn controls from the interface and the Server SHALL ignore any "increment_turn" actions received
6. WHEN a game ends with the turn counter enabled, THE Server SHALL include the total turn count in the persisted game data
7. WHILE the turn counter is disabled in the room, THE Server SHALL persist a null value for the turn count when the game ends

### Requirement 11: Game Formats

**User Story:** As a player, I want to choose between different Magic formats, so that the counter adapts to the initial life rules of each format.

#### Acceptance Criteria

1. THE System SHALL support the following formats with their corresponding initial life: Commander (40), 20 life (20), Custom (initial life configurable by the room creator, entered as a positive integer numeric value)
2. WHEN a room is created, THE System SHALL fix the initial life according to the selected format and apply it to all players who subsequently join the room
3. WHEN the format is Commander, THE System SHALL enable commander search and commander damage functionalities in the game interface
4. WHEN the format is not Commander, THE System SHALL hide commander search and commander damage functionalities from the game interface
5. WHEN the selected format is Custom, THE System SHALL present a numeric input field where the room creator enters the desired initial life value before confirming room creation

### Requirement 12: Visual Interface and Personalization

**User Story:** As a player, I want the interface to be visually attractive with a dark theme and distinctive colors per player, so that I can quickly identify each participant.

#### Acceptance Criteria

1. IF a player does not have a commander image assigned, THEN THE Client SHALL display as their panel background the color corresponding to their room entry position, following the cyclic order: purple, blue, green, red, yellow, pink, indigo, teal, orange, cyan, magenta, lime (12 colors assigned to positions 1-12)
2. WHILE a player has a commander image, THE Client SHALL use the card art as the player panel background image, replacing the assigned color, with a darkening overlay layer to maintain text readability
3. THE Client SHALL display a border of at least 2px thickness in purple color around the local player's panel, differentiating it from other players' panels that have no highlighted border
4. WHILE a player is disconnected, THE Client SHALL display a label with the text "disconnected" in red color over a dark semi-transparent background within that player's panel
5. THE Client SHALL use a dark theme where the general background color has a luminosity below 15% and the main text has a luminosity above 80%, ensuring a minimum contrast ratio of 4.5:1 between text and background

### Requirement 13: Poison Counter

**User Story:** As a player, I want to track each player's poison counters, so that I can determine when a player is eliminated by poison damage (10 counters).

#### Acceptance Criteria

1. WHILE the poison counters configuration is enabled in the room, THE Client SHALL display a Poison_Counter on each player's panel with the current poison counter value
2. WHEN a player joins a room with poison counters enabled, THE System SHALL initialize the player's poison counter at 0
3. THE Poison_Counter SHALL provide increment (+1) and decrement (-1) buttons with a minimum touch area of 44x44px
4. WHEN a player presses the poison increment button, THE System SHALL add 1 poison counter to the target player and transmit the new state to all connected players in the room
5. WHEN a player presses the poison decrement button, THE System SHALL subtract 1 poison counter from the target player and transmit the new state to all connected players in the room
6. WHEN a player long-presses (500 milliseconds or more) the poison increment button, THE System SHALL add 10 poison counters to the target player and transmit the new state to all connected players in the room
7. WHEN a player long-presses (500 milliseconds or more) the poison decrement button, THE System SHALL subtract 10 poison counters from the target player and transmit the new state to all connected players in the room
8. IF a poison decrement action would result in a value less than 0, THEN THE Server SHALL set the poison counter value to 0 instead of applying the decrement
9. WHEN a player's poison counter reaches or exceeds 10, THE Client SHALL display a visual elimination indication due to poison on the affected player's panel
10. WHILE the poison counters configuration is disabled in the room, THE Client SHALL hide the Poison_Counter from all player panels

### Requirement 14: Local Room (Solo Mode)

**User Story:** As an authenticated player, I want to create a local room where I can add multiple players without them needing accounts, so that I can use the application as a traditional life counter at a gaming table.

#### Acceptance Criteria

1. WHEN an authenticated user selects "Create Local Room", THE System SHALL create a room that functions without external WebSocket connections, managed entirely by the creator user's Client
2. WHEN a Local_Room is created, THE System SHALL present the same configuration options as a normal room: format selector (Commander, 20 life, Custom), option to enable poison counters, and option to enable turn counter
3. WHEN the Local_Room is created, THE System SHALL allow the creator user to add between 2 and 12 local players by entering only a name for each Local_Player (between 1 and 30 characters)
4. THE System SHALL apply the same format, initial life, commander damage, and poison counter rules in a Local_Room as in a normal room
5. THE Client SHALL display a maximum of 6 players visible simultaneously in the Local_Room, with scrolling or pagination capability to access remaining players
6. WHEN the Local_Room ends with the "end_game" action, THE System SHALL persist the game in the history of the authenticated user who created the room, including the names of all Local_Players
7. THE System SHALL allow only the authenticated user who created the Local_Room to perform life adjustment, commander damage, and poison actions on all Local_Players
8. IF an unauthenticated user attempts to create a Local_Room, THEN THE System SHALL redirect the user to the login screen with a message indicating that authentication is required for local mode

### Requirement 15: Random Starting Player Selection

**User Story:** As a player, I want the system to randomly select who starts the game, so that the decision is fair and entertaining.

#### Acceptance Criteria

1. WHEN at least 2 players are connected to a room (normal or local), THE Client SHALL display a "Choose Starting Player" button accessible to any connected player
2. WHEN a player presses the "Choose Starting Player" button, THE System SHALL select a player at random from all active players in the room using a pseudorandom number generator
3. WHEN the random selection begins, THE Client SHALL display a roulette-type animation that visually cycles through player names for a minimum of 2 seconds and a maximum of 4 seconds before stopping on the selected player
4. WHEN the animation ends and the selected player is revealed, THE Client SHALL visually highlight the chosen player with a distinctive indicator (golden border and highlighted text) for at least 3 seconds
5. WHEN the random selection is executed in a normal room (WebSocket), THE Server SHALL determine the selected player and broadcast the result to all connected players so that the animation is synchronized across all clients
6. WHEN the random selection is executed in a Local_Room, THE Client SHALL determine the selected player locally without communication with the Server
7. THE System SHALL allow executing the random selection multiple times during the same game without restriction

### Requirement 16: Last Player Standing Detection

**User Story:** As a player, I want the system to automatically detect when only one player has life remaining, so that I can end the game efficiently.

#### Acceptance Criteria

1. WHEN only one player in the room has life points greater than 0 and all other players have life equal to or less than 0, THE System SHALL display a message asking if the user wants to mark the game as finished
2. WHEN the user confirms they want to end the game after last player standing detection, THE System SHALL execute the "end_game" action registering the player with life as the winner
3. WHEN the game is ended after last player standing confirmation, THE System SHALL display a message asking if the user wants to start a new game with the same players and same room configuration (format, poison, turns)
4. WHEN the user confirms starting a new game with the same players, THE System SHALL reset all players' life to the format's initial value, reset poison counters to 0 if enabled, reset commander damage to 0 if applicable, and reset the turn counter to 0 if enabled
5. IF the user rejects ending the game after detection, THEN THE System SHALL close the message and allow the game to continue without modifying any state
6. IF the user rejects starting a new game after the game ends, THEN THE System SHALL maintain the finished game screen showing the final state
7. THE System SHALL evaluate the last player standing condition only when the room has 2 or more registered players
8. WHEN a player previously marked as eliminated (life equal to or less than 0) receives a life increment that brings them above 0, THE System SHALL cancel that player's elimination status, remove their Elimination_Cause record and their position in the elimination order, and retransmit the updated state to all connected players
9. WHEN a player's elimination status is canceled due to life recovery, THE System SHALL re-evaluate the last player standing condition considering the revived player as active again

### Requirement 17: Elimination Cause

**User Story:** As an authenticated player, I want the system to record how each player was eliminated, so that statistics reflect the different ways of losing in Magic.

#### Acceptance Criteria

1. WHEN a player is eliminated during a game, THE System SHALL record the Elimination_Cause with one of the following values: "normal damage" (life reached 0 or below), "commander damage" (21 or more points of accumulated damage from a single commander source), or "poison" (10 or more poison counters)
2. WHEN a commander damage action causes the accumulated damage from a single source to reach or exceed 21 points on a target player, and that same action also causes the target player's life to reach 0 or below, THEN THE System SHALL record the elimination cause as "normal damage" since the life reduction to 0 is the determining condition
3. WHEN a commander damage action causes the accumulated damage from a single source to reach or exceed 21 points on a target player, and the target player's life remains above 0 after the action, THEN THE System SHALL record the elimination cause as "commander damage"
4. WHEN a player's poison counter reaches or exceeds 10, THE System SHALL record the elimination cause as "poison" regardless of the player's current life
5. THE System SHALL record the elimination order of players as a sequential numeric value (1 for the first eliminated, 2 for the second, and so on)
6. WHEN the game ends, THE Server SHALL persist the elimination cause and elimination order of each eliminated player along with the other game data
7. WHEN the life of a player previously eliminated by "normal damage" is incremented above 0, THE System SHALL remove the recorded Elimination_Cause and remove their position from the elimination order, treating the player as active again
8. WHEN the life of a player previously eliminated by "commander damage" is incremented above 0, THE System SHALL remove the recorded Elimination_Cause and remove their position from the elimination order, treating the player as active again
9. WHEN a player is revived (elimination canceled by life recovery), THE System SHALL adjust the elimination order positions of subsequently eliminated players to maintain a continuous numeric sequence

### Requirement 18: Game History Editing

**User Story:** As an authenticated player, I want to be able to edit data from completed games, so that I can correct errors in elimination causes and elimination order of players.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the detail of a completed game in the history section, THE History_Editor SHALL display an "Edit" button that opens an editing panel with the game's modifiable data
2. WHEN the editing panel is open, THE History_Editor SHALL allow modifying the elimination cause of each eliminated player by selecting from the options: "normal damage", "commander damage", and "poison"
3. WHEN the editing panel is open, THE History_Editor SHALL allow modifying the elimination order of each eliminated player by entering a positive integer numeric value, allowing two or more players to share the same position value (tie)
4. WHEN the user confirms changes in the editing panel, THE History_Editor SHALL send the updated data to the Server and the Server SHALL persist the modifications replacing the previous values
5. IF the user cancels the edit, THEN THE History_Editor SHALL close the panel without modifying the game data
6. THE History_Editor SHALL allow editing only of games in which the authenticated user participated as a player or as the creator of the Local_Room
7. WHEN a game's data is edited, THE Statistics_Module SHALL recalculate the affected metrics (elimination causes and order) using the updated values

### Requirement 19: Commander and Deck Registry

**User Story:** As an authenticated player, I want to see a registry of all commanders and decks I've used, so that I can analyze each deck's performance, know which ones I haven't used recently, and see who else has played with a specific deck.

#### Acceptance Criteria

1. WHEN an authenticated user finishes a game in Commander format, THE Commander_Registry SHALL store the commander name (or Partner_Pair) used associated with the user, the deck from the Deck_Collection (if selected from "My Decks"), and the game
2. WHEN an authenticated user accesses the commander registry section, THE Commander_Registry SHALL display a list of all distinct commanders and decks the user has used, ordered by last use date descending
3. THE Commander_Registry SHALL show for each commander or deck: commander name (or both names if Partner_Pair), win percentage (wins / games played multiplied by 100, rounded to one decimal place), total number of uses (games played), date of the last game in which it was used, and list of players who have used that same deck in shared games with the user
4. WHEN an authenticated user requests statistics for a specific commander or deck, THE Commander_Registry SHALL calculate the metrics using only completed games in which the user selected that commander or deck
5. IF an authenticated user has no completed games in Commander format, THEN THE Commander_Registry SHALL display an empty list with a message indicating that no commanders are registered
6. THE Commander_Registry SHALL automatically update a commander or deck's statistics when an associated game is edited via the History_Editor

### Requirement 20: CSV Statistics Export

**User Story:** As an authenticated player, I want to export my statistics in CSV format, so that I can analyze my data in external tools like spreadsheets.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the statistics section, THE CSV_Exporter SHALL display an "Export CSV" button visible in the interface
2. WHEN the user presses the "Export CSV" button, THE CSV_Exporter SHALL generate a CSV file containing all the user's statistics tables: general statistics (win percentage, win count, total games played, elimination cause breakdown), deck statistics (deck or commander name, total games, wins, win percentage, players who have used it), rival statistics (rival name, total games together, user's wins, win percentage), and game log (date, players, decks, elimination position of each player)
3. THE CSV_Exporter SHALL generate the CSV file with UTF-8 encoding, comma separator, and a row of descriptive headers in Spanish for each data section, separating each table with an empty row and a section header
4. WHEN the CSV file is generated, THE Client SHALL initiate automatic download of the file with the name format "estadisticas_{username}_{date_YYYYMMDD}.csv"
5. IF the user has no statistics data, THEN THE CSV_Exporter SHALL generate a CSV file with the header rows and zero values for all metrics
6. THE CSV_Exporter SHALL include deck statistics data only if the user has at least one completed game with a deck registered in the Deck_Collection or in Commander format
7. THE CSV_Exporter SHALL include the game log table with one row per participating player in each game, allowing shared elimination positions (ties) represented with the same numeric value

### Requirement 21: Deck Collection ("My Decks")

**User Story:** As an authenticated player, I want to register and manage my personal decks, so that I can quickly select them when joining games without searching Scryfall again each time.

#### Acceptance Criteria

1. WHEN an authenticated user accesses the "My Decks" section, THE Deck_Collection SHALL display the list of all decks registered by the user, ordered by last use date descending
2. WHEN an authenticated user selects "Add Deck" with Commander format, THE Deck_Collection SHALL present the Scryfall search to select the deck's commander (including Partner support with a second search field if the selected card has the Partner ability)
3. WHEN an authenticated user selects "Add Deck" with a format different from Commander (20 life or Custom), THE Deck_Collection SHALL present a free text field where the user enters a custom name to identify the deck (between 1 and 100 characters)
4. WHEN a user confirms deck creation, THE Deck_Collection SHALL store the deck with the following data: name or commander (or Partner_Pair), associated format (Commander, 20 life, or Custom), and initial status "active"
5. THE Deck_Collection SHALL allow the user to change each deck's status between "active" and "inactive" to organize decks they no longer use without deleting them
6. THE Deck_Collection SHALL show for each deck: name or commander (both names if Partner_Pair), format, status (active/inactive), and summary statistics (total games played and win percentage) obtained from the Statistics_Module
7. WHEN an authenticated user joins a room or creates a Local_Room, THE System SHALL present a "My Decks" toggle next to the commander search or name field, which when activated shows the filtered list of the user's active decks whose format matches the room's format
8. WHEN the "My Decks" toggle is active and the user selects a deck from the list, THE System SHALL pre-fill the commander data (name, art_crop image, and second partner if applicable) or the deck name as appropriate for the format
9. WHEN a user plays a game using a deck selected from "My Decks", THE System SHALL associate that game with the deck in the Deck_Collection to feed the Deck_Statistics
10. IF an authenticated user has no registered decks, THEN THE Deck_Collection SHALL display a message indicating that no decks are registered and a button to add the first deck
11. THE Deck_Collection SHALL allow the user to delete a deck from their collection, keeping historical statistics of games played with that deck intact
