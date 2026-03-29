import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, X, ShieldCheck, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { useUsuarios, useRegistrarUsuario, useToggleUsuario } from '../../queries/usuarios.queries';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';
import styles from './Usuarios.module.css';

const ROL_LABELS = { admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' };
const ROL_COLORS = { admin: 'accent', vendedor: 'secondary', bodega: 'warning' };

function RolBadge({ rol }) {
  return (
    <span className={`${styles.rolBadge} ${styles[`rol_${rol}`]}`}>
      {ROL_LABELS[rol] ?? rol}
    </span>
  );
}

function ModalCrear({ onClose }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: { rol: 'vendedor', tienda_id: 1 },
  });
  const [showPass, setShowPass] = useState(false);
  const mutation = useRegistrarUsuario();
  const toast = useToast();
  const { user } = useAuth();

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { ...values, tienda_id: Number(values.tienda_id) || user.tienda_id },
      {
        onSuccess: () => {
          toast.success('Usuario creado correctamente');
          reset();
          onClose();
        },
        onError: (err) => {
          const msg = err?.response?.data?.error ?? 'Error al crear el usuario';
          toast.error(msg);
        },
      }
    );
  });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderIcon}>
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className={styles.modalTitle}>Nuevo usuario</h2>
            <p className={styles.modalSub}>Completa los datos del colaborador</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            {/* Nombre */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Nombre completo <span className={styles.req}>*</span></label>
              <input
                className={`${styles.formInput} ${errors.nombre ? styles.inputError : ''}`}
                placeholder="Ej: Juan Pérez"
                {...register('nombre', { required: 'El nombre es obligatorio' })}
              />
              {errors.nombre && <span className={styles.errorMsg}>{errors.nombre.message}</span>}
            </div>

            {/* Email */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Correo electrónico <span className={styles.req}>*</span></label>
              <input
                type="email"
                className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
                placeholder="correo@ejemplo.com"
                {...register('email', {
                  required: 'El email es obligatorio',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
                })}
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
            </div>

            {/* Contraseña */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Contraseña <span className={styles.req}>*</span></label>
              <div className={styles.passWrap}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`${styles.formInput} ${styles.passInput} ${errors.password ? styles.inputError : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  {...register('password', {
                    required: 'La contraseña es obligatoria',
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                  })}
                />
                <button type="button" className={styles.passToggle} onClick={() => setShowPass((v) => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className={styles.errorMsg}>{errors.password.message}</span>}
            </div>

            {/* Rol */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Rol <span className={styles.req}>*</span></label>
              <div className={styles.rolGrid}>
                {['admin', 'vendedor', 'bodega'].map((r) => (
                  <label key={r} className={styles.rolOption}>
                    <input type="radio" value={r} {...register('rol')} hidden />
                    <span className={`${styles.rolOptionInner} ${styles[`rolOpt_${r}`]}`}>
                      <ShieldCheck size={15} />
                      {ROL_LABELS[r]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tienda */}
            <div className={styles.formField}>
              <label className={styles.formLabel}>Tienda ID <span className={styles.req}>*</span></label>
              <input
                type="number"
                min="1"
                className={`${styles.formInput} ${errors.tienda_id ? styles.inputError : ''}`}
                {...register('tienda_id', { required: 'Requerido', min: { value: 1, message: 'Mínimo 1' } })}
              />
              {errors.tienda_id && <span className={styles.errorMsg}>{errors.tienda_id.message}</span>}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose} disabled={mutation.isLoading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useUsuarios();
  const toggleMutation = useToggleUsuario();
  const toast = useToast();
  const { user: me } = useAuth();

  const usuarios = data?.usuarios ?? [];

  const handleToggle = (u) => {
    if (u.id === me.id) return toast.warning('No puedes desactivar tu propia cuenta');
    toggleMutation.mutate(u.id, {
      onSuccess: (res) => {
        const estado = res.usuario.activo ? 'activado' : 'desactivado';
        toast.success(`Usuario ${estado} correctamente`);
      },
      onError: () => toast.error('Error al cambiar el estado'),
    });
  };

  const formatFecha = (iso) =>
    new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Usuarios</h1>
          <p className={styles.pageSubtitle}>Gestión de accesos y roles</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={refetch} disabled={isFetching}>
            <RefreshCw size={15} className={isFetching ? styles.spinning : ''} />
            Actualizar
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <UserPlus size={16} />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <p className={styles.empty}>Cargando usuarios...</p>
        ) : isError ? (
          <p className={styles.empty}>Error al cargar los usuarios</p>
        ) : usuarios.length === 0 ? (
          <p className={styles.empty}>No hay usuarios registrados</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Tienda</th>
                <th>Creado</th>
                <th className={styles.centerCol}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={!u.activo ? styles.rowInactiva : ''}>
                  <td>
                    <span className={styles.userName}>{u.nombre}</span>
                    {u.id === me.id && <span className={styles.youTag}>Tú</span>}
                  </td>
                  <td className={styles.emailCell}>{u.email}</td>
                  <td><RolBadge rol={u.rol} /></td>
                  <td className={styles.tiendaCell}>{u.tienda_nombre ?? `#${u.tienda_id}`}</td>
                  <td className={styles.fechaCell}>{formatFecha(u.creado_en)}</td>
                  <td className={styles.centerCol}>
                    <button
                      className={`${styles.toggleBtn} ${u.activo ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleToggle(u)}
                      disabled={toggleMutation.isLoading || u.id === me.id}
                      title={u.id === me.id ? 'No puedes desactivarte a ti mismo' : (u.activo ? 'Desactivar' : 'Activar')}
                    >
                      {u.activo
                        ? <><ToggleRight size={20} /> Activo</>
                        : <><ToggleLeft size={20} /> Inactivo</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <ModalCrear onClose={() => setShowModal(false)} />}
    </div>
  );
}
