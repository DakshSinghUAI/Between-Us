import { Button } from '@/components/ui/button';

const Button1 = ({ onClick }) => {
  return (
    <Button variant="default" onClick={onClick}>
      Add a Memory ❤️
    </Button>
  );
};

export default Button1;