import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function withRouter(Component: React.ComponentType<any>) {
    function ComponentWithRouterProp(props: any) {
        let location = useLocation();
        let navigate = useNavigate();
        let params = useParams();
        return (
            <Component
                {...props}
                location={location}
                navigate={navigate}
                params={params}
            />
        );
    }

    return ComponentWithRouterProp;
}
