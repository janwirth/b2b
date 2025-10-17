Feature: Clipboard

Scenario: Copying and pasting from clipboard
    And I open localhost:3000
    When I click 'Copy to clipboard'
    Then I see 'Link copied'
    And I open the copied link
    Then the image contains "Hello World"
