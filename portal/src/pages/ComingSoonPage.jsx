/* eslint-disable react/prop-types -- page */
import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { Button, Card, EmptyState, PageHeader } from '../components/ui';

// Placeholder for sidebar sections that aren't built yet, so they never show a 404.
function ComingSoonPage({ title, description, backTo }) {
  return (
    <>
      <PageHeader title={title} subtitle={description} />
      <Card>
        <EmptyState
          icon={Hammer}
          title={`${title} is coming soon`}
          description="This section is part of the next release."
          action={
            <Button as={Link} to={backTo} variant="primary">
              Back to overview
            </Button>
          }
        />
      </Card>
    </>
  );
}

export default ComingSoonPage;
