/* eslint-disable react-refresh/only-export-components -- router hooks and components intentionally share one tiny module */
import { Children, createContext, type MouseEvent, type ReactElement, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

interface RouterValue { path: string; navigate: (to: string, options?: { replace?: boolean }) => void; }
const RouterContext = createContext<RouterValue | null>(null);
const OutletContext = createContext<ReactNode>(null);
const ParamsContext = createContext<Record<string, string>>({});

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  const value = useMemo<RouterValue>(() => ({ path, navigate(to, options) { window.history[options?.replace ? 'replaceState' : 'pushState']({}, '', to); setPath(window.location.pathname); window.scrollTo({ top: 0, behavior: 'smooth' }); } }), [path]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

interface RouteProps { path?: string; index?: boolean; element: ReactElement; children?: ReactNode; }
export function Route(props: RouteProps) { void props; return null; }

export function Routes({ children }: { children: ReactNode }) {
  const router = useRouter();
  const roots = Children.toArray(children) as ReactElement<RouteProps>[];
  const root = roots.find((item) => !item.props.path && !item.props.index && item.props.children);
  const candidates = (root ? Children.toArray(root.props.children) : roots) as ReactElement<RouteProps>[];
  let selected: ReactElement | null = null;
  let params: Record<string, string> = {};
  for (const candidate of candidates) {
    const pattern = candidate.props.index ? '/' : `/${candidate.props.path ?? ''}`.replaceAll('//', '/');
    const match = matchPath(pattern, router.path);
    if (match) { selected = candidate.props.element; params = match; break; }
  }
  const content = <ParamsContext.Provider value={params}>{selected}</ParamsContext.Provider>;
  if (!root) return content;
  return <ParamsContext.Provider value={params}><OutletContext.Provider value={selected}>{root.props.element}</OutletContext.Provider></ParamsContext.Provider>;
}

export function Outlet() { return <>{useContext(OutletContext)}</>; }

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => navigate(to, { replace }), [navigate, replace, to]);
  return null;
}

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> { to: string; }
export function Link({ to, onClick, ...props }: LinkProps) {
  const navigate = useNavigate();
  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(to); }
  }
  return <a href={to} onClick={handle} {...props} />;
}

interface NavLinkProps extends Omit<LinkProps, 'className'> { end?: boolean; className?: string | ((state: { isActive: boolean }) => string); }
export function NavLink({ end, className, ...props }: NavLinkProps) {
  const { path } = useRouter();
  const active = end ? path === props.to : path === props.to || path.startsWith(`${props.to}/`);
  return <Link {...props} className={typeof className === 'function' ? className({ isActive: active }) : className} />;
}

export function useNavigate() {
  const { navigate } = useRouter();
  return useMemo(() => navigate, [navigate]);
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>() { return useContext(ParamsContext) as T; }

function useRouter() { const value = useContext(RouterContext); if (!value) throw new Error('BrowserRouter is required'); return value; }

function matchPath(pattern: string, path: string): Record<string, string> | null {
  if (pattern === '/*' || pattern === '*') return {};
  const expected = pattern.split('/').filter(Boolean); const actual = path.split('/').filter(Boolean);
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
    else if (expected[i] !== actual[i]) return null;
  }
  return params;
}
