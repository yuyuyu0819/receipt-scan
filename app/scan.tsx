import LoginScreen from '../components/LoginScreen';
import ReceiptFlow from '../components/ReceiptFlow';
import { useSession } from '../context/SessionContext';

export default function ScanScreen() {
  const { user } = useSession();

  if (!user) {
    return <LoginScreen />;
  }

  return <ReceiptFlow />;
}
