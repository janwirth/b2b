Feature: Reload
  Ensure refreshes work - the text disappears after refresh

  Scenario: Reload after interaction
    When I open localhost:3000
    Then I see "Hello World"
    And when I click "Press me"
    Then I see "The sun is shining"
    And I reload the page
    And I wait 1 seconds
    Then I see "Hello World"
    And I do not see "The sun is shining"
