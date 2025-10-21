@focus
Feature: Reload
  As a user
  I want to reload the page
  So that I can test page refresh functionality

  Scenario: Reload the page
    When I open localhost:3000
    Then I see "Hello World"
    And I reload the page
    Then I see "Hello World"

  Scenario: Reload after interaction
    When I open localhost:3000
    Then I see "Hello World"
    And when I click "Press me"
    Then I see "The sun is shining"
    And I reload the page
    Then I see "Hello World"
    And I do not see "The sun is shining"
