import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

function Sample() {
  return (
    <View>
      <Text>hello</Text>
    </View>
  );
}

describe('test infra smoke test', () => {
  it('renders a component with RTL', async () => {
    const { getByText } = await render(<Sample />);
    expect(getByText('hello')).toBeTruthy();
  });
});
