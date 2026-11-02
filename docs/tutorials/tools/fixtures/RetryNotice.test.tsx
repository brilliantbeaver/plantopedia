import { Button, Text, View } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';

function RetryNotice({ onRetry }: { onRetry: () => void }) {
  return <View>
    <Text>Your garden could not be loaded.</Text>
    <Button title="Try again" onPress={onRetry} />
  </View>;
}

test('a failed load gives the person an actionable retry', async () => {
  const retry = jest.fn();
  const user = userEvent.setup();
  render(<RetryNotice onRetry={retry} />);
  expect(screen.getByText('Your garden could not be loaded.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
