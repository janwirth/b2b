Feature: Reset Application State

Scenario: Reset endpoint clears test data
    When I open localhost:3000/reset-status
    Then I see "stale data"
    When I ping localhost:3000/reset
    And I reload the page
    Then I see "cleared"
